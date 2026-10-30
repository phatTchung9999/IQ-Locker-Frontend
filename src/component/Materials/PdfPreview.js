import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
const assets = `${process.env.PUBLIC_URL || ''}/pdfjs/`;
pdfjs.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.${pdfjs.version}.min.mjs`;

export default function PdfPreview({ bytes }) {
  const [document, setDocument] = useState(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState('');
  const [textError, setTextError] = useState('');
  const [rendering, setRendering] = useState(true);
  const [text, setText] = useState('');
  const canvas = useRef(null);
  const container = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(160, entry.contentRect.width - 16)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    setError(''); setTextError(''); setDocument(null); setText(''); setRendering(true);
    const task = pdfjs.getDocument({ data: new Uint8Array(bytes.slice(0)), isEvalSupported: false, enableXfa: false,
      cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`, useSystemFonts: true });
    task.promise.then((pdf) => { if (active) { setDocument(pdf); setPage(1); } }).catch(() => { if (active) setError('We couldn’t preview this PDF. You can still download the original.'); });
    return () => { active = false; void task.destroy().catch(() => {}); };
  }, [bytes]);
  useEffect(() => {
    if (!document) return;
    let active = true, task;
    setRendering(true); setText(''); setError(''); setTextError('');
    document.getPage(page).then(async (pdfPage) => {
      if (!active || !canvas.current) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const original = pdfPage.getViewport({ scale: 1 });
      const viewport = pdfPage.getViewport({ scale: Math.min(1.5, width / original.width) * zoom * ratio });
      const node = canvas.current;
      node.width = viewport.width; node.height = viewport.height;
      node.style.width = `${viewport.width / ratio}px`; node.style.height = `${viewport.height / ratio}px`;
      task = pdfPage.render({ canvas: node, canvasContext: node.getContext('2d'), viewport });
      await task.promise;
      if (!active) return;
      try {
        const content = await pdfPage.getTextContent(); // We got bug right here, text content is not extracted for some PDFs.
        if (active) setText(content.items.map((item) => item.str || '').join(' '));
      } catch {
        if (active) setTextError('This page is visible, but its text could not be extracted for accessibility. You can still view or download the original.');
      }
    }).catch((err) => { if (active && err.name !== 'RenderingCancelledException') setError('This page could not be rendered. Download the original to view it.'); })
      .finally(() => { if (active) setRendering(false); });
    return () => { active = false; task?.cancel(); };
  }, [document, page, width, zoom]);
  return <Box ref={container} sx={{ width: '100%', textAlign: 'center' }}>
    {error && <Alert severity="warning">{error}</Alert>}
    {textError && <Alert severity="warning">{textError}</Alert>}
    {rendering && !error && <CircularProgress size={24} aria-label="Rendering PDF" />}
    {document && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}><Button disabled={page <= 1 || rendering} onClick={() => setPage((p) => p - 1)}>Previous</Button><Typography sx={{ fontSize: 12 }}>Page {page} of {document.numPages}</Typography><Button disabled={page >= document.numPages || rendering} onClick={() => setPage((p) => p + 1)}>Next</Button></Box>}
    {document && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      <Button aria-label="Zoom out PDF" disabled={zoom <= 1 || rendering} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>−</Button>
      <Typography sx={{ fontSize: 12 }}>{Math.round(zoom * 100)}%</Typography>
      <Button aria-label="Zoom in PDF" disabled={zoom >= 4 || rendering} onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>+</Button>
      <Button disabled={zoom === 1 || rendering} onClick={() => setZoom(1)} sx={{ fontSize: 12 }}>Fit width</Button>
    </Box>}
    <Box sx={{ overflowX: 'auto' }}><canvas ref={canvas} role="img" aria-label={`PDF page ${page}`} style={{ maxWidth: 'none', margin: '0 auto', display: 'block' }} /></Box>
    <Box sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>{text}</Box>
  </Box>;
}
