import streamlit as st
from streamlit_gsheets import GSheetsConnection
import pandas as pd
import plotly.express as px
from datetime import date, timedelta, datetime

# --- 1. CONFIGURACIÓN ---
st.set_page_config(page_title="Gestor Inmuebles", page_icon="🏢", layout="wide")

# CSS: Fija colores y estilos para evitar conflictos de tema
st.markdown("""
    <style>
    /* 1. FONDOS Y TÍTULOS */
    .stApp { background-color: #f0f2f6; } 

    /* FUNCIÓN DE TÍTULO BLINDADO (LA SOLUCIÓN AL PROBLEMA DE COLOR) */
    .titulo-blindado {
        color: #1a2936 !important; /* Color oscuro */
        font-family: 'Segoe UI', sans-serif;
        margin-top: 1.5rem;
    }
    
    /* 2. TARJETAS DE MÉTRICAS */
    .metric-card {
        background-color: #ffffff !important;
        border-radius: 10px;
        padding: 15px;
        border: 1px solid #d1d8e0;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.05);
        text-align: center;
        margin-bottom: 10px;
    }
    .metric-label { color: #555555 !important; font-size: 14px !important; font-weight: bold; }
    .metric-value { color: #1E88E5 !important; font-size: 28px !important; font-weight: 800; }

    /* 3. BOTONES */
    .stButton>button {
        width: 100%;
        border-radius: 8px;
        height: 3.5rem;
        font-weight: 600;
        background-color: #1E88E5 !important;
        color: white !important;
    }
    .block-container { padding-top: 1rem; }
    </style>
""", unsafe_allow_html=True)

# --- FUNCIÓN DE TÍTULO BLINDADO (USAMOS DIV EN LUGAR DE H2/H3) ---
def titulo_blindado(texto, nivel=2):
    """Genera un título usando un DIV estilizado para evitar el filtro de color de iOS."""
    if nivel == 2:
        style = "font-size: 1.5rem; font-weight: 700;"
    else:
        style = "font-size: 1.3rem; font-weight: 600;"
        
    st.markdown(
        f"<div class='titulo-blindado' style='{style}'>{texto}</div>", 
        unsafe_allow_html=True
    )
# -----------------------------------------------------------------

# --- 2. CONEXIÓN Y DATOS ---
try:
    conn = st.connection("gsheets", type=GSheetsConnection)
except:
    st.error("⚠️ Error de conexión.")
    st.stop()

def cargar_datos(pestaña):
    try:
        df = conn.read(worksheet=pestaña, ttl=0)
        return df.dropna(how="all")
    except:
        return pd.DataFrame()

def guardar_datos(df, pestaña):
    try:
        conn.update(worksheet=pestaña, data=df)
        st.cache_data.clear()
        st.toast("✅ Sincronizado")
        return True
    except:
        st.error("Error al guardar.")
        return False

# Carga
df_inm = cargar_datos("Inmuebles")
df_res = cargar_datos("Reservas")
if not df_res.empty:
    df_res["Inicio"] = pd.to_datetime(df_res["Inicio"], errors='coerce').dt.date
    df_res["Fin"] = pd.to_datetime(df_res["Fin"], errors='coerce').dt.date
    df_res["ID_Reserva"] = df_res["ID_Reserva"].astype(str).str.replace(".0", "", regex=False)

# --- 5. NAVEGACIÓN ---
with st.sidebar:
    st.title("🏢 Propify")
    menu = st.radio("Secciones:", ["Dashboard", "Inmuebles", "Reservas"])

# ==========================================
# PANTALLA 1: DASHBOARD
# ==========================================
if menu == "Dashboard":
    titulo_blindado("Resumen General", 2) # TITULO CORREGIDO
    
    # MÉTRICAS
    hoy = date.today()
    activos = len(df_res[(df_res["Inicio"] <= hoy) & (df_res["Fin"] >= hoy)]) if not df_res.empty else 0
    total = len(df_inm)
    
    c1, c2 = st.columns(2)
    with c1: st.markdown(f"""<div class="metric-card"><div class="metric-label">PROPIEDADES</div><div class="metric-value">{total}</div></div>""", unsafe_allow_html=True)
    with c2: st.markdown(f"""<div class="metric-card"><div class="metric-label">ALQUILADAS HOY</div><div class="metric-value">{activos}</div></div>""", unsafe_allow_html=True)
            
    st.write("---")
    titulo_blindado("Calendario de Ocupación", 3) # SUBTITULO CORREGIDO
    
    if not df_res.empty and not df_inm.empty:
        df_chart = df_res.dropna(subset=["Inicio", "Fin", "Propiedad"])
        fig = px.timeline(df_chart, x_start="Inicio", x_end="Fin", y="Propiedad", color="Inquilino")
        fig.update_traces(width=0.4, opacity=0.9); fig.update_yaxes(autorange="reversed")
        fig.update_layout(height=350, showlegend=True, legend=dict(orientation="h", y=1.2, x=0))
        st.plotly_chart(fig, use_container_width=True)

    st.write("---")
    with st.expander("➕ Nueva Reserva Rápida", expanded=False):
        titulo_blindado("Formulario de Reserva", 3) # SUBTITULO CORREGIDO
        with st.form("f_dash"):
            p = st.selectbox("Inmueble", df_inm["Nombre"].unique()) if not df_inm.empty else None
            i = st.text_input("Inquilino")
            f = st.date_input("Periodo", [hoy, hoy+timedelta(days=7)])
            if st.form_submit_button("Guardar Reserva"):
                if p and len(f) == 2:
                    nid = datetime.now().strftime("%H%M%S")
                    new = pd.DataFrame([{"ID_Reserva": nid, "Propiedad": p, "Inquilino": i, "Inicio": str(f[0]), "Fin": str(f[1])}])
                    if guardar_datos(pd.concat([df_res, new], ignore_index=True), "Reservas"): st.rerun()

# ==========================================
# PANTALLA 2: PROPIEDADES
# ==========================================
elif menu == "Inmuebles":
    titulo_blindado("Gestión de Propiedades", 2) # TITULO CORREGIDO
    accion = st.radio("Acción:", ["Ver Lista", "➕ Crear Nueva", "✏️ Editar Existente"], horizontal=True)

    if accion == "Añadir":
        with st.form("f_inm"):
            titulo_blindado("Crear Propiedad", 3)
            n = st.text_input("Nombre Corto")
            d = st.text_input("Dirección"); c = st.text_area("Notas")
            if st.form_submit_button("Guardar"):
                if n:
                    new = pd.DataFrame([{"Nombre": n, "Direccion": d, "Caracteristicas": c}])
                    if guardar_datos(pd.concat([df_inm, new], ignore_index=True), "Inmuebles"): st.rerun()

    elif accion == "Editar/Borrar":
        if not df_inm.empty:
            with st.container(border=True):
                titulo_blindado("Editar/Borrar Propiedad", 3)
                sel = st.selectbox("Selecciona:", df_inm["Nombre"])
                dat = df_inm[df_inm["Nombre"] == sel].iloc[0]
                with st.form("e_inm"):
                    nd = st.text_input("Dirección", value=dat["Direccion"])
                    nc = st.text_area("Notas", value=dat["Caracteristicas"])
                    if st.form_submit_button("Actualizar"):
                        idx = df_inm[df_inm["Nombre"] == sel].index
                        df_inm.at[idx[0], "Direccion"] = nd
                        df_inm.at[idx[0], "Caracteristicas"] = nc
                        if guardar_datos(df_inm, "Inmuebles"): st.rerun()
                if st.button("🗑️ Eliminar Propiedad"):
                    df_inm = df_inm[df_inm["Nombre"] != sel]; df_res = df_res[df_res["Propiedad"] != sel]
                    guardar_datos(df_inm, "Inmuebles"); guardar_datos(df_res, "Reservas"); st.rerun()
    
    st.write("---"); st.dataframe(df_inm, use_container_width=True, hide_index=True)

# ==========================================
# PANTALLA 3: RESERVAS
# ==========================================
elif menu == "Reservas":
    titulo_blindado("Gestión de Reservas", 2) # TITULO CORREGIDO
    
    if not df_res.empty:
        with st.expander("✏️ Editar o Borrar Reserva", expanded=True):
            titulo_blindado("Modificar Reserva", 3) # SUBTITULO CORREGIDO
            opc = df_res.apply(lambda x: f"{x['Propiedad']} | {x['Inquilino']}", axis=1)
            sel_idx = st.selectbox("Busca reserva:", df_res.index, format_func=lambda x: opc[x])
            d_res = df_res.loc[sel_idx]
            with st.form("e_res"):
                idx_p = list(df_inm["Nombre"]).index(d_res["Propiedad"]) if d_res["Propiedad"] in df_inm["Nombre"].values else 0
                p = st.selectbox("Propiedad", df_inm["Nombre"].unique(), index=idx_p)
                i = st.text_input("Inquilino", value=d_res["Inquilino"])
                f = st.date_input("Fechas", [d_res["Inicio"], d_res["Fin"]])
                if st.form_submit_button("Actualizar"):
                    if len(f) == 2:
                        df_res.at[sel_idx, "Propiedad"] = p; df_res.at[sel_idx, "Inquilino"] = i
                        df_res.at[sel_idx, "Inicio"] = str(f[0]); df_res.at[sel_idx, "Fin"] = str(f[1])
                        if guardar_datos(df_res, "Reservas"): st.rerun()
            if st.button("🗑️ Eliminar Reserva"):
                if guardar_datos(df_res.drop(sel_idx), "Reservas"): st.rerun()
    
    st.write("---"); st.dataframe(df_res[["Propiedad", "Inquilino", "Inicio", "Fin"]], use_container_width=True, hide_index=True)