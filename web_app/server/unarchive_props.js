require('dotenv').config();
const { getRows, updateRow } = require('./services/sheetService');

async function fixArchived() {
    try {
        const props = await getRows('Properties');
        for (const p of props) {
            if (String(p.archived || '').toLowerCase() === 'true') {
                console.log(`Unarchiving: ${p.address}`);
                await updateRow('Properties', p.id, { archived: 'false' });
            }
        }
        console.log('All properties unarchived.');
    } catch (err) {
        console.error(err);
    }
}

fixArchived();
