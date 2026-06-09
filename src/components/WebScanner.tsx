import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';

interface Props {
  onScanned: (code: string) => void;
  onClose: () => void;
  count: number;
  lastScanned: string;
  recentCodes?: string[];
}

function extractCode(raw: string): string {
  const trimmed = raw.trim();
  if (/^[A-Z0-9\-]{6,30}$/i.test(trimmed)) return trimmed.toUpperCase();
  const matches = trimmed.match(/\d{6,}/g);
  if (matches) return matches.reduce((a, b) => (a.length >= b.length ? a : b));
  return trimmed.replace(/\s+/g, '');
}

export function WebScanner({ onScanned, onClose, count, lastScanned, recentCodes }: Props) {
  const videoRef = useRef<any>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  // Per-code deduplication: same code blocked for 2s, different codes scan immediately
  const lastCode = useRef('');
  const lastCodeTime = useRef(0);
  // Always-current ref so the ZXing callback never uses a stale closure
  const onScannedRef = useRef(onScanned);
  useEffect(() => { onScannedRef.current = onScanned; }, [onScanned]);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIdx, setDeviceIdx] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Initialize ZXing and enumerate cameras ────────────────────
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    readerRef.current = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 });

    BrowserMultiFormatReader.listVideoInputDevices()
      .then((devs) => {
        if (devs.length === 0) {
          setError('Nenhuma câmera encontrada.');
          return;
        }
        setDevices(devs);
        const rearIdx = devs.findIndex((d) =>
          /back|rear|traseira|posterior|environment/i.test(d.label)
        );
        setDeviceIdx(rearIdx >= 0 ? rearIdx : devs.length - 1);
      })
      .catch(() => setError('Não foi possível listar as câmeras.'));
  }, []);

  // ─── Start scanning when deviceIdx is ready ────────────────────
  useEffect(() => {
    if (deviceIdx < 0 || !devices[deviceIdx] || !readerRef.current) return;

    let active = true;
    setLoading(true);
    const deviceId = devices[deviceIdx].deviceId;
    const reader = readerRef.current;

    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (!active || !result) return;
        const code = extractCode(result.getText());
        const now = Date.now();
        // Same code: ignore for 2 seconds to prevent double-scan
        if (code === lastCode.current && now - lastCodeTime.current < 2000) return;
        lastCode.current = code;
        lastCodeTime.current = now;
        onScannedRef.current(code);
      })
      .then(() => { if (active) setLoading(false); })
      .catch(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      try { reader.reset(); } catch {}
    };
  }, [deviceIdx, devices]);

  function flipCamera() {
    if (devices.length < 2) return;
    try { readerRef.current?.reset(); } catch {}
    setDeviceIdx((i) => (i + 1) % devices.length);
  }

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

  const currentLabel = devices[deviceIdx]?.label || '';
  const isFront = /front|frontal|user|face|selfie/i.test(currentLabel) ||
    (devices.length >= 2 && deviceIdx === 0 && !/back|rear|traseira/i.test(currentLabel));

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {React.createElement('video', {
        ref: videoRef,
        style: {
          position: 'absolute', top: 0, left: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          zIndex: 1,
        },
      })}

      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 3, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFE600" />
          <Text style={{ color: '#fff', marginTop: 12, fontSize: 13 }}>Iniciando câmera...</Text>
        </View>
      )}

      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2, justifyContent: 'space-between' }}>
        {/* Top bar */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          padding: 16, paddingTop: 52,
          backgroundColor: 'rgba(0,0,0,0.65)',
        }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              ✓ Feito ({count})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={flipCamera}
            style={{
              backgroundColor: 'rgba(255,255,255,0.25)',
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}
          >
            <Text style={{ fontSize: 16 }}>🔄</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
              {isFront ? 'Frontal' : 'Traseira'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Center frame */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 280, height: 170, position: 'relative' }}>
            {[
              { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
              { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
              { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
              { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
            ].map((s, i) => (
              <View key={i} style={[{ position: 'absolute', width: 32, height: 32, borderColor: '#FFE600', borderWidth: 3 }, s as any]} />
            ))}
          </View>
        </View>

        {/* Bottom: feedback + recent list */}
        <View style={{ paddingBottom: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 8, paddingHorizontal: 16 }}>
            {lastScanned ? (
              <View style={{
                backgroundColor: lastScanned.startsWith('⚠️') ? '#FB8C00' : '#43A047',
                paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16,
              }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
                  {lastScanned}
                </Text>
              </View>
            ) : (
              <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ color: '#ddd', fontSize: 13 }}>Aponte para o código de barras ou QR</Text>
              </View>
            )}
          </View>

          {recentCodes && recentCodes.length > 0 && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.75)', padding: 12 }}>
              <Text style={{ color: '#aaa', fontSize: 11, marginBottom: 6 }}>Na lista ({count}):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentCodes.slice(0, 8).map((code, i) => (
                  <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>{code.slice(-8)}</Text>
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
