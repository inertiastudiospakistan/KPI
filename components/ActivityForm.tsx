
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { ActivityType, Activity, User } from '../types';
import { db } from '../services/db';

interface ActivityFormProps {
  user: User;
  type: ActivityType;
  onCancel: () => void;
  onSuccess: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ user, type, onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    personName: '',
    address: '',
    phone: '',
    notes: '',
    images: [] as string[],
  });
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number; method: 'gps' | 'network' } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState('');

  // Use refs to track state for callbacks to avoid stale closures
  const isCapturingRef = useRef(false);
  const locationRef = useRef<any>(null);
  const isFallingBackRef = useRef(false); // Track if we're in fallback mode to prevent useEffect re-trigger
  const hasAttemptedRef = useRef(false); // Track if we've already attempted GPS capture on step 2

  const captureLocation = useCallback((highAccuracy: boolean = true) => {
    // Prevent multiple concurrent captures (but allow fallback call)
    if (isCapturingRef.current && !isFallingBackRef.current) return;

    // Reset fallback flag when starting a new capture
    if (highAccuracy) {
      isFallingBackRef.current = false;
    }

    setLocationError(null);
    setIsCapturing(true);
    isCapturingRef.current = true;

    if (!navigator.geolocation) {
      const msg = "Geolocation is not supported by your browser.";
      setLocationError(msg);
      setIsCapturing(false);
      isCapturingRef.current = false;
      isFallingBackRef.current = false;
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: highAccuracy,
      timeout: highAccuracy ? 15000 : 10000, // Shorter timeout for faster UX
      maximumAge: 0,   // Force fresh reading
    };

    console.log(`Starting ${highAccuracy ? 'High Accuracy' : 'Standard'} GPS Capture...`);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          method: (highAccuracy ? 'gps' : 'network') as 'gps' | 'network'
        };
        setLocation(newLoc);
        locationRef.current = newLoc;
        setLocationError(null);
        setIsCapturing(false);
        isCapturingRef.current = false;
        isFallingBackRef.current = false;
        console.log("GPS Lock Successful:", newLoc);
      },
      (err) => {
        console.error("GPS Error Code:", err.code, "Message:", err.message);

        // If high accuracy fails, immediately try standard accuracy fallback
        if (highAccuracy && (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE)) {
          console.warn("High accuracy GPS failed/timed out, falling back to standard accuracy...");
          // Set fallback flag BEFORE resetting isCapturing to prevent useEffect from triggering
          isFallingBackRef.current = true;
          isCapturingRef.current = false;
          // Keep isCapturing true in React state to show loading UI
          // We'll call captureLocation(false) which will set it properly
          captureLocation(false);
          return;
        }

        let msg = "Unknown location error.";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = "Location permission denied. Please allow GPS access in your browser settings.";
            break;
          case err.POSITION_UNAVAILABLE:
            msg = "Location info unavailable. Please ensure GPS/Location is ON in device settings.";
            break;
          case err.TIMEOUT:
            msg = "GPS request timed out. Please move to an open area with clear sky view.";
            break;
        }

        setLocationError(msg);
        setIsCapturing(false);
        isCapturingRef.current = false;
        isFallingBackRef.current = false;
      },
      options
    );
  }, []);

  // Trigger capture when moving to Step 2 automatically
  useEffect(() => {
    // Only auto-trigger once per step 2 visit, and not during fallback
    if (step === 2 && !location && !isCapturing && !locationError && !isFallingBackRef.current && !hasAttemptedRef.current) {
      hasAttemptedRef.current = true;
      captureLocation(true);
    }
    // Reset the attempt flag when leaving step 2
    if (step !== 2) {
      hasAttemptedRef.current = false;
    }
  }, [step, location, isCapturing, locationError, captureLocation]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1024; // Reduced max dimension for mobile optimization
          const MAX_HEIGHT = 1024;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG with 0.6 quality (good balance for mobile evidence)
            resolve(canvas.toDataURL('image/jpeg', 0.6));
          } else {
            reject(new Error("Canvas context not available"));
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError("Please upload an image file.");
        return;
      }

      setLoading(true); // Show loading state while compressing
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, compressedBase64].slice(0, 3)
        }));
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error("Image compression failed:", err);
        setError("Failed to process image. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    if (!match) throw new Error("Invalid data URL");
    const mime = match[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Cloudinary Upload Function
  const uploadImage = async (blob: Blob): Promise<string> => {
    const cloudName = 'dmsostlde';
    const uploadPreset = 'dragon_app_preset'; // User must create this Unsigned Preset in Cloudinary Dashboard
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', uploadPreset);

    try {
      const response = await fetch(url, { method: 'POST', body: formData });
      if (!response.ok) {
        throw new Error(`Cloudinary upload failed: ${response.statusText}`);
      }
      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      throw err;
    }
  };

  const handleSubmit = async () => {
    if (!location || formData.images.length === 0) {
      setError("Location and at least one image are mandatory.");
      return;
    }

    setLoading(true);
    try {
      // Parallel uploads to Cloudinary
      const uploadedURLs = await Promise.all(
        formData.images.map(async (imgBase64) => {
          const blob = dataURLtoBlob(imgBase64);
          return uploadImage(blob);
        })
      );

      await db.addActivity({
        employeeId: user.uid,
        employeeName: user.name,
        type,
        personName: formData.personName,
        address: formData.address,
        phone: formData.phone,
        notes: formData.notes,
        imageURLs: uploadedURLs,
        gpsLat: location.lat,
        gpsLng: location.lng,
        accuracy: location.accuracy,
        timestamp: Date.now(),
        approved: null,
      });

      onSuccess();
    } catch (err: any) {
      console.error("Submission failed:", err);
      setError("Failed to transmit data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col max-w-md mx-auto overflow-hidden">
      <div className="bg-dragon-red text-white p-4 flex items-center gap-4 flex-shrink-0 shadow-md">
        <button onClick={onCancel} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
        <h2 className="text-xl font-black tracking-tight">{type === 'farmer' ? 'Farmer' : 'Dealer'} Advisory</h2>
      </div>

      <div className="flex-grow p-6 overflow-y-auto space-y-6 pb-20">
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${step >= s ? 'bg-dragon-red' : 'bg-gray-200'}`} />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs font-black uppercase border border-red-100 flex items-start gap-2 animate-in fade-in zoom-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <header>
              <h3 className="text-xl font-black text-gray-900">Entity Details</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Step 1: Contact Information</p>
            </header>

            <div className="space-y-4">
              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Name of Recipient *</label>
                <input type="text" placeholder="e.g. John Doe / Green Valley Corp" value={formData.personName} onChange={e => setFormData({ ...formData, personName: e.target.value })} className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-dragon-red transition-all font-semibold" />
              </div>

              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Physical Address *</label>
                <textarea placeholder="Plot Number, Village, District..." rows={2} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-dragon-red transition-all font-semibold" />
              </div>

              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Contact Phone *</label>
                <input type="tel" placeholder="+254..." value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-dragon-red transition-all font-semibold" />
              </div>

              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Observations</label>
                <textarea placeholder="Any additional field notes..." rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none focus:border-dragon-red transition-all font-semibold" />
              </div>
            </div>

            <button
              disabled={!formData.personName || !formData.address || !formData.phone}
              onClick={() => setStep(2)}
              className="w-full py-5 bg-dragon-red text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-100 disabled:bg-gray-200 active:scale-95 transition-all"
            >
              Continue to Verification
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <header>
              <h3 className="text-xl font-black text-gray-900">Field Verification</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Step 2: Location & Evidence</p>
            </header>

            <div className={`bg-gray-50 p-6 rounded-3xl border-2 transition-all duration-500 flex flex-col gap-4 ${location ? 'border-green-100' : locationError ? 'border-red-100' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm ${location ? 'bg-green-100 text-green-600' : locationError ? 'bg-red-100 text-red-600' : 'bg-gray-200 animate-pulse text-gray-400'}`}>
                  {location ? '📍' : locationError ? '❌' : '📡'}
                </div>
                <div className="flex-grow">
                  <p className="text-sm font-black text-gray-900 leading-tight">
                    {location ? 'Location Locked' : locationError ? 'GPS Access Error' : 'Capturing Coordinates...'}
                  </p>
                  {locationError && <p className="text-[10px] text-red-500 font-bold uppercase mt-1 leading-tight">{locationError}</p>}
                  {!location && !locationError && isCapturing && <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 animate-pulse">Waiting for Satellite Fix...</p>}
                </div>
              </div>

              {location && (
                <div className="p-4 rounded-2xl border-2 border-white bg-white/50 space-y-2">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-tighter">Signal Accuracy ({location.method.toUpperCase()})</p>
                    <p className="text-2xl font-black text-dragon-red tracking-tight">± {Math.round(location.accuracy)} meters</p>
                  </div>
                  <button onClick={() => captureLocation(true)} className="w-full py-2 text-[8px] font-black uppercase text-dragon-red hover:underline">Recalibrate Signal</button>
                </div>
              )}

              {(!location && !isCapturing) && (
                <div className="space-y-3">
                  <button
                    onClick={() => captureLocation(true)}
                    className="w-full py-4 bg-dragon-red text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                  >
                    {locationError ? 'Retry GPS Capture' : 'Start Location Search'}
                  </button>
                  <p className="text-[9px] text-center text-gray-400 font-bold uppercase">Manual capture recommended if automatic search hangs</p>
                </div>
              )}

              {isCapturing && (
                <div className="text-center py-2">
                  <div className="inline-block w-4 h-4 border-2 border-dragon-red/30 border-t-dragon-red rounded-full animate-spin"></div>
                  <span className="ml-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Searching...</span>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1">Photo Evidence (Max 3) *</label>
              <div className="grid grid-cols-3 gap-3">
                {formData.images.map((img, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 relative group">
                    <img src={img} className="w-full h-full object-cover" alt="Captured" />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg"
                    >✕</button>
                  </div>
                ))}
                {formData.images.length < 3 && (
                  <label className={`aspect-square border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center transition-colors group ${loading ? 'bg-gray-50 cursor-wait' : 'cursor-pointer hover:bg-gray-50'}`}>
                    {loading ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-dragon-red border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[8px] font-black uppercase text-gray-400">Processing...</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-3xl group-hover:scale-110 transition-transform">📸</span>
                        <span className="text-[8px] font-black uppercase mt-1 text-gray-400">Add Photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} disabled={loading} />
                  </label>
                )}
              </div>
            </div>

            <div className="pt-4 space-y-4">
              <button
                disabled={!location || formData.images.length === 0 || isCapturing}
                onClick={() => setStep(3)}
                className="w-full py-5 bg-dragon-red text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-100 disabled:bg-gray-200 active:scale-95 transition-all"
              >
                {isCapturing ? 'Waiting for Signal...' : 'Review Submission'}
              </button>
              <button onClick={() => setStep(1)} className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-dragon-red transition-colors">Return to step 1</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <header>
              <h3 className="text-xl font-black text-gray-900">Final Confirmation</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Step 3: Protocol Compliance</p>
            </header>

            <div className="bg-gray-50 p-6 rounded-3xl space-y-4 border-2 border-gray-100 text-sm shadow-inner">
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Protocol Type</span>
                <span className="font-black text-dragon-red capitalize">{type} Advisory</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Entity Name</span>
                <span className="font-black text-gray-900">{formData.personName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Evidence</span>
                <span className="font-black text-gray-900">{formData.images.length} Photos</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Signal Locked</span>
                <span className="font-black text-green-600">✓ {location?.method.toUpperCase()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="w-full py-5 bg-dragon-red text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-200 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Transmitting Data...
                  </>
                ) : 'Finalize & Upload Report'}
              </button>
              <button
                disabled={loading}
                onClick={() => setStep(2)}
                className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-dragon-red transition-colors"
              >
                Back to Evidence
              </button>
            </div>

            <p className="text-[10px] text-center text-gray-400 font-bold uppercase leading-relaxed">
              By submitting, you certify that you are physically present at the reported location.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityForm;
