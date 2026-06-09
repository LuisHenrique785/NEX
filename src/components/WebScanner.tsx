import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface Props {
  onScanned: (code: string) => void;
  onClose: () => void;
  count: number;
  lastScanned: string;
  recentCodes?: string[];
}

export function WebScanner({ onScanned, onClose, count, lastScanned, recentCodes }: Props) {
  const videoRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const cooldown = useRef(false);

  const [error, setError] = useState<string | null>(null);
  // 0 = back, 1 = front, cycling through all video devices
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIdx, setDeviceIdx] = useState(0);

  // ─── Start camera by deviceId ──────────────────────────────────
  const startStream = useCallback(async (deviceId: string) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    cancelAnimationFrame(rafRef.current);

    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;

      const video = videoRef.current as HTMLVideoElement | null;
      if (video) {
        video.srcObject = stream;
        await video.play();
        // Try continuous autofocus
        const track = stream.getVideoTracks()[0] as any;
        try {
          const caps = track.getCapabilities?.();
          if (caps?.focusMode?.includes('continuous')) {
            await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
          }
        } catch { /* focus not supported */ }
      }
      scanLoop();
    } catch (e: any) {
      setError('Erro ao acessar a câmera: ' + (e.message || 'permissão negada'));
    }
  }, []);

  // ─── Enumerate devices → pick rear camera ──────────────────────
  useEffect(() => {
    const BD = (window as any).BarcodeDetector;
    if (!BD) {
      setError('Seu navegador não suporta scanner automático.\nUse a entrada manual (⌨️ Digitar).');
      return;
    }
    detectorRef.current = new BD({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix', 'itf'],
    });

    (async () => {
      try {
        // Step 1: request any camera to unlock device labels
        const tmpStream = await (navigator as any).mediaDevices.getUserMedia({ video: true });
        tmpStream.getTracks().forEach((t: MediaStreamTrack) => t.stop());

        // Step 2: enumerate with labels now available
        const all = await (navigator as any).mediaDevices.enumerateDevices() as MediaDeviceInfo[];
        const vids = all.filter((d) => d.kind === 'videoinput');
        if (vids.length === 0) { setError('Nenhuma câmera encontrada.'); return; }

        setDevices(vids);

        // Step 3: pick the rear camera
        // Prefer label containing 'back', 'rear', 'traseira', 'posterior', 'environment'
        // On Android Chrome: typically labeled "camera2 0" (front) and "camera2 1" (back)
        // or "Back Camera" / "Front Camera"
        const rearIdx = vids.findIndex((d) =>
          /back|rear|traseira|posterior|environment|\b1\b/i.test(d.label)
        );
        // If no match by label, use last device (rear camera is usually last on Android)
        const idx = rearIdx >= 0 ? rearIdx : vids.length - 1;
        setDeviceIdx(idx);
        await startStream(vids[idx].deviceId);
      } catch (e: any) {
        setError('Não foi possível acessar a câmera.\nVerifique as permissões do navegador.');
      }
    })();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Flip: cycle to next device ────────────────────────────────
  async function flipCamera() {
    if (devices.length < 2) return;
    const next = (deviceIdx + 1) % devices.length;
    setDeviceIdx(next);
    await startStream(devices[next].deviceId);
  }

  // ─── Barcode scan loop ─────────────────────────────────────────
  function scanLoop() {
    const video = videoRef.current as HTMLVideoElement | null;
    if (!detectorRef.current || !video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    detectorRef.current
      .detect(video)
      .then((results: any[]) => {
        if (results.length > 0 && !cooldown.current) {
          cooldown.current = true;
          onScanned(results[0].rawValue);
          setTimeout(() => { cooldown.current = false; }, 1500);
        }
      })
      .catch(() => {})
      .finally(() => { rafRef.current = requestAnimationFrame(scanLoop); });
  }

  // ─── Error state ───────────────────────────────────────────────
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📷</Text>
        <Text style={{ color: '#fff', textAlign: 'center', fontSize: 15, lineHeight: 24, marginBottom: 28 }}>{error}</Text>
        <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#FFE600', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}>
          <Text style={{ fontWeight: '800', fontSize: 15 }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const camLabel = devices[deviceIdx]?.label || '';
  const isFront = /front|frontal|user|face|selfie|\b0\b/i.test(camLabel);

  // ─── Scanner UI ────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* Video element fills screen */}
      {React.createElement('video', {
        ref: videoRef,
        style: {
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        },
        playsInline: true,
        muted: true,
        autoPlay: true,
      })}

      {/* Overlay — above video */}
      <View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 2,
        justifyContent: 'space-between',
      }}>

        {/* Top bar */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: 16, paddingTop: 52,
          backgroundColor: 'rgba(0,0,0,0.6)',
        }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              ✓ Feito ({count})
            </Text>
          </TouchableOpacity>
          {devices.length > 1 && (
            <TouchableOpacity
              onPress={flipCamera}
              style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                🔄 {isFront ? 'Frontal' : 'Traseira'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Center frame */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 260, height: 160, position: 'relative' }}>
            {[
              { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
              { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
              { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
              { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
            ].map((s, i) => (
              <View key={i} style={[{
                position: 'absolute', width: 32, height: 32,
                borderColor: '#FFE600', borderWidth: 3,
              }, s as any]} />
            ))}
          </View>
        </View>

        {/* Bottom: result + recent list */}
        <View style={{ paddingBottom: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            {lastScanned ? (
              <View style={{
                backgroundColor: lastScanned.startsWith('⚠️') ? '#FB8C00' : '#43A047',
                paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16,
              }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{lastScanned}</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ color: '#ddd', fontSize: 13 }}>Aponte para o código de barras</Text>
              </View>
            )}
          </View>

          {recentCodes && recentCodes.length > 0 && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', padding: 12 }}>
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 6 }}>
                Na lista ({count}):
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentCodes.slice(0, 8).map((code, i) => (
                  <View key={i} style={{
                    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 4, marginRight: 8,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>
                      {code.slice(-8)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
