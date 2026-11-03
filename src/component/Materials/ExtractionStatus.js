import { Box, Button, Typography } from '@mui/material';
const states = {
  not_started: ['Awaiting text extraction', '#647487', '#f0f2f5'],
  queued: ['Text extraction queued', '#657487', '#eef1f5'],
  processing: ['Extracting text…', '#3d648b', '#edf3f9'],
  ready: ['Text ready', '#426d56', '#edf5ef'],
  failed: ['Text extraction failed', '#996234', '#fff4e8'],
};
const failures = {
  no_readable_text: 'No readable text was found. Scanned PDFs need OCR, which isn’t supported yet.',
  parser_failed: 'We couldn’t extract text from this document.',
  timeout: 'Text extraction took too long.',
  storage_unavailable: 'Text extraction is temporarily unavailable.',
  output_limit: 'This document exceeds the text processing limits.',
  attempts_exhausted: 'Text extraction reached its retry limit.',
};
export default function ExtractionStatus({ material, retrying, onRetry }) {
  const state = states[material.processingStatus];
  if (material.state !== 'ready' || !state) return null;
  const failed = material.processingStatus === 'failed';
  const exhausted = Number.isInteger(material.processingAttempts) && Number.isInteger(material.processingMaxAttempts) && material.processingAttempts >= material.processingMaxAttempts;
  return <Box sx={{ px: 2, pb: 1.5, pl: { xs: 2, sm: 8 } }}>
    <Box role="status" aria-label={`Text extraction status for ${material.title}`}>
      <Box component="span" sx={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: state[1], bgcolor: state[2], px: 1, py: 0.5, borderRadius: '6px' }}>{state[0]}</Box>
      {failed && <Typography sx={{ fontSize: 12, color: '#7d6b58', mt: 0.75, overflowWrap: 'anywhere' }}>{failures[material.processingErrorCode] || 'Text extraction could not be completed.'} {exhausted && material.processingErrorCode !== 'attempts_exhausted' ? 'Retry limit reached. ' : ''}You can still open or download the original.</Typography>}
    </Box>
    {failed && material.canRetryExtraction === true && <Button size="small" disabled={retrying} aria-label={`Retry text extraction for ${material.title}`} onClick={() => onRetry(material)} sx={{ mt: 0.5, p: 0, minHeight: 36, textTransform: 'none', color: '#40566e' }}>{retrying ? 'Queuing retry…' : 'Retry text extraction'}</Button>}
  </Box>;
}
