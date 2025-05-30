const { ValidateSession, GetSessBase, GetSessUser, RefreshVNCList } = require("./main")
const VMIPath = require('../../vmipath');
const path = require("path");
const fs = require("fs");
const multer = require('multer');
const axios   = require('axios');

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const Type = req.body.FileType
		const Dest = path.join(VMIPath, 'media', Type)
		fs.mkdirSync(Dest, { recursive: true })
		cb(null, Dest)
	},
	filename: (req, file, cb) => cb(null, file.originalname)
})

const upload = multer({ storage })

module.exports = (router) => {
	router.post('/upload', upload.single('file'), async (req, res) => {
		const VMIToken = req.get('Authorization')?.split(' ')[1]
		if (!VMIToken || !(await ValidateSession(VMIToken, req))) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { UploadType, FileType, FileURL } = req.body;
		const DestDir = path.join(VMIPath, 'media', FileType);
		fs.mkdirSync(DestDir, { recursive: true });

		if (UploadType === 'FILE') {
			if (!req.file) {
				return res.status(400).json({ error: 'No file uploaded' });
			}
			return res.json({
				success:   true,
				uploadType: UploadType,
				fileType:  FileType,
				filename:  req.file.originalname,
				size:      req.file.size
			});
		}

		else if (UploadType === 'URL') {
			if (!FileURL) {
				return res.status(400).json({ error: 'No URL provided' });
			}

			let HeadRes;
			try {
				HeadRes = await axios.head(FileURL, { timeout: 5000 });
			} catch (err) {
				return res.status(400).json({ error: 'Remote URL not reachable or returned error', details: err.message });
			}
			if (HeadRes.status >= 400) {
				return res.status(400).json({ error: `Remote URL returned status ${headRes.status}` });
			}

			const TotalBytes = parseInt(HeadRes.headers['content-length'] || '0', 10);
			const Filename   = path.basename(new URL(FileURL).pathname) || `download-${Date.now()}`;
			const OutPath    = path.join(DestDir, Filename);

			res.setHeader('Content-Type',       'text/event-stream');
			res.setHeader('Cache-Control',      'no-cache');
			res.setHeader('X-Accel-Buffering',  'no'); // nginx needs this
			res.flushHeaders();

			let Downloaded = 0;
			const Writer   = fs.createWriteStream(OutPath);
			try {
				const StreamRes = await axios.get(FileURL, { responseType: 'stream' });
				StreamRes.data.on('data', chunk => {
					Downloaded += chunk.length;
					const pct = TotalBytes ? Math.round(Downloaded / TotalBytes * 100) : null;
					res.write(`event: progress\n`);
					res.write(`data: ${JSON.stringify({
						loaded:     Downloaded,
						total:      TotalBytes,
						percent:    pct,
						Filename
					})}\n\n`);
				});

				StreamRes.data.pipe(Writer);

				Writer.on('finish', () => {
					res.write(`event: complete\n`);
					res.write(`data: ${JSON.stringify({
						success:    true,
						uploadType: 'URL',
						fileType:   FileType,
						Filename,
						size:       Downloaded
					})}\n\n`);
					return res.end();
				});

				Writer.on('error', err => {
					res.write(`event: error\n`);
					res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`);
					return res.end();
				});
			}
				catch (err) {
					res.write(`event: error\n`);
					res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`);
					return res.end();
			}
		}

		else {
			return res.status(400).json({ error: 'Invalid uploadtype' });
		}

	});
}

