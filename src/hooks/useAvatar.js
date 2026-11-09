import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { courseOptions } from '../component/Courses/courseData';
const endpoint = '/api/v1/user/me/avatar';
const message = err => {
  const value = err.response?.data?.message;
  return typeof value === 'string' ? value : Array.isArray(value) ? value.join(' ') : 'Couldn’t save your photo. Please try again.';
};

// One authenticated avatar fetch per workspace, shared by profile and sidebar.
// Object URLs stay in memory only and are revoked on replacement/logout/unmount.
export default function useAvatar(email, onUnauthorized) {
  const [state, setState] = useState({ email, url: '', hasAvatar: false, loading: true, busy: false, error: '' });
  const alive = useRef(false), image = useRef(''), savedImage = useRef(null), load = useRef(null), mutation = useRef(null);
  const unauthorized = useRef(onUnauthorized); unauthorized.current = onUnauthorized;
  const replace = useCallback(url => {
    if (image.current) URL.revokeObjectURL(image.current);
    image.current = url;
  }, []);
  const read = useCallback(async signal => {
    try {
      const { data } = await api.get(endpoint, { ...courseOptions(signal), responseType: 'blob' });
      if (signal.aborted) return false;
      if (!(data instanceof Blob) || data.type !== 'image/webp' || !data.size || data.size > 5_000_000) throw new Error('Invalid image response');
      const url = URL.createObjectURL(data); savedImage.current = data; replace(url);
      setState(previous => ({ ...previous, email, url, hasAvatar: true, error: '' }));
      return true;
    } catch (err) {
      if (signal.aborted) return false;
      if ([401, 403].includes(err.response?.status)) unauthorized.current?.();
      else if (err.response?.status === 404) {
        savedImage.current = null; replace(''); setState(previous => ({ ...previous, email, url: '', hasAvatar: false, error: '' })); return true;
      } else setState(previous => ({ ...previous, error: 'Couldn’t load your saved photo. Please try again.' }));
      return false;
    }
  }, [email, replace]);
  const refresh = useCallback(async () => {
    if (mutation.current) return;
    load.current?.abort();
    const controller = new AbortController(); load.current = controller;
    setState(previous => ({ ...previous, loading: true, error: '' }));
    await read(controller.signal);
    if (!controller.signal.aborted && alive.current) setState(previous => ({ ...previous, loading: false }));
  }, [read]);
  useEffect(() => {
    alive.current = true;
    setState({ email, url: '', hasAvatar: false, loading: true, busy: false, error: '' });
    void refresh();
    return () => {
      alive.current = false; load.current?.abort(); mutation.current?.abort();
      load.current = null; mutation.current = null; savedImage.current = null; replace('');
    };
  }, [email, refresh, replace]);

  const change = async (file, rotation = 0) => {
    if (mutation.current) return false;
    load.current?.abort();
    const controller = new AbortController(); mutation.current = controller;
    setState(previous => ({ ...previous, loading: false, busy: true, error: '' }));
    try {
      if (file) {
        const form = new FormData(); form.append('file', file);
        if (rotation) form.append('rotation', String(rotation));
        const { data } = await api.post(endpoint, form, { ...courseOptions(controller.signal), timeout: 180000 });
        if (controller.signal.aborted) return false;
        if (data?.hasAvatar !== true) throw new Error('Invalid avatar response');
        setState(previous => ({ ...previous, hasAvatar: true }));
        // Fetch the normalized server image, not the original local preview.
        const loaded = await read(controller.signal);
        if (!loaded && !controller.signal.aborted) setState(previous => ({ ...previous,
          error: 'Photo saved, but couldn’t load it yet. Retry loading your photo.' }));
      } else {
        await api.delete(endpoint, courseOptions(controller.signal));
        if (controller.signal.aborted) return false;
        savedImage.current = null; replace(''); setState(previous => ({ ...previous, url: '', hasAvatar: false, error: '' }));
      }
      return !controller.signal.aborted;
    } catch (err) {
      if (!controller.signal.aborted) {
        if ([401, 403].includes(err.response?.status)) unauthorized.current?.();
        else setState(previous => ({ ...previous, error: file ? message(err) : 'Couldn’t remove your photo. Please try again.' }));
      }
      return false;
    } finally {
      if (!controller.signal.aborted && alive.current) setState(previous => ({ ...previous, busy: false }));
      if (mutation.current === controller) mutation.current = null;
    }
  };
  const imageError = () => {
    savedImage.current = null; replace(''); setState(previous => ({ ...previous, url: '', error: 'Couldn’t display your saved photo. Please try again.' }));
  };
  return { ...state, url: state.email === email ? state.url : '', refresh, upload: (file, rotation = 0) => change(file, rotation), savedFile: () => savedImage.current ? new File([savedImage.current], 'avatar.webp', { type: 'image/webp' }) : null, remove: () => change(null), imageError };
}
