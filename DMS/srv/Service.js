const { serve } = require("@sap/cds")
const { model } = require("@sap/cds")
const cds = require("@sap/cds")

module.exports = cds.service.impl( async (srv) => {
    srv.before("READ","*",async (req) => {
        console.log("Hello Mice check")
    })
    const { File } = srv.entities;

    srv.on('getFileContent', async (req) => {
        const fileUUID = "19853841-988c-4004-9a0e-40e5eff3b343"

        // Fetch the binary data from DB
        const result = await SELECT.one.from(File)
            .columns('FileContent', 'FileType', 'FileName')
            .where({ FileUUID: fileUUID });

        if (!result || !result.FileContent) {
            return req.error(404, 'File not found or no content.');
        }
        const stream = result.FileContent;

        // Convert Readable stream to Buffer
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        const base64Content = buffer.toString('base64');

        return {
            fileName: result.OriginalFileName,
            mimeType: result.FileType,
            base64Content: base64Content
        };
    });
})