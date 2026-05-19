import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { ChevronLeft, X, Upload, Check, ImageIcon, FileWarning, Sparkles } from 'lucide-react';
import { Album } from '../../types';
import { cn } from '../../lib/utils';
import { db, handleFirestoreError, OperationType, toTimestamp } from '../../lib/firebase';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { useFirebase } from '../../lib/FirebaseProvider';

interface UploadScreenProps {
  album: Album;
  onBack: () => void;
  onComplete: () => void;
}

const MOMENT_LABELS = ['Morning', 'Ceremony', 'Afternoon', 'Dinner', 'Party', 'Late Night'];

export default function UploadScreen({ album, onBack, onComplete }: UploadScreenProps) {
  const { user } = useFirebase();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'image/*': [] }
  } as any);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);
    
    try {
      const photosRef = collection(db, 'albums', album.id, 'photos');
      const albumRef = doc(db, 'albums', album.id);
      
      for (let i = 0; i < files.length; i++) {
        // In a real app, we'd upload to Firebase Storage here.
        // For this demo, we'll use high-quality placeholder URLs since storage isn't provisioned.
        const demoUrls = [
            'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800',
            'https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&q=80&w=800'
        ];
        const randomUrl = demoUrls[Math.floor(Math.random() * demoUrls.length)];

        await addDoc(photosRef, {
          albumId: album.id,
          uploaderId: user.userId,
          uploaderName: user.displayName,
          url: randomUrl,
          type: 'photo',
          createdAt: toTimestamp(new Date()),
          reactions: { heart: 0 },
          timestampLabel: MOMENT_LABELS[Math.floor(Math.random() * MOMENT_LABELS.length)]
        });

        // Update album photo count
        await updateDoc(albumRef, {
          photoCount: increment(1)
        });

        setProgress(((i + 1) / files.length) * 100);
      }

      setTimeout(onComplete, 500);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `albums/${album.id}/photos`);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-cream">
      <header className="p-6 flex items-center justify-between">
        <button onClick={onBack} disabled={uploading} className="p-2 rounded-full hover:bg-brand-charcoal/5 disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-6 h-6 text-brand-charcoal" />
        </button>
        <h2 className="text-lg font-serif">Add Memories</h2>
        <div className="w-10" />
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-4">
        {!uploading ? (
          <div className="space-y-8">
            <div 
              {...getRootProps()} 
              className={`p-10 rounded-[3rem] border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragActive ? 'border-brand-peach bg-brand-peach/5 scale-102' : 'border-brand-charcoal/10 bg-white hover:border-brand-peach/40'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 bg-brand-beige rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Upload className="w-8 h-8 text-brand-charcoal" />
              </div>
              <p className="text-brand-charcoal font-semibold mb-2">Tap to take or pick photos</p>
              <p className="text-brand-muted text-xs">High quality photos preferred</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted ml-2">Selected ({files.length})</h3>
                   <button onClick={() => setFiles([])} className="text-xs text-red-500 font-bold hover:underline">Clear all</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <AnimatePresence>
                    {files.map((file, index) => (
                      <motion.div 
                        key={`${file.name}-${index}`}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-2xl overflow-hidden shadow-sm group"
                      >
                        <img 
                          src={URL.createObjectURL(file)} 
                          className="w-full h-full object-cover" 
                          alt="preview" 
                        />
                        <button 
                          onClick={() => removeFile(index)} 
                          className="absolute top-1 right-1 p-1 bg-black/40 text-white rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4">
             <div className="relative w-32 h-32 mb-10">
                <svg className="w-full h-full rotate-[-90deg]">
                   <circle
                    cx="64" cy="64" r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-brand-charcoal/5"
                   />
                   <motion.circle
                    cx="64" cy="64" r="60"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={377}
                    strokeDashoffset={377 - (377 * progress) / 100}
                    strokeLinecap="round"
                    className="text-brand-peach transition-all duration-300"
                   />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                   <span className="text-2xl font-serif text-brand-charcoal">{Math.round(progress)}%</span>
                </div>
             </div>

             <h3 className="text-xl font-serif text-brand-charcoal mb-4">Preserving your moments...</h3>
             <p className="text-brand-muted text-sm max-w-xs mx-auto animate-pulse">
                Sending these special memories to the shared book. This will just take a second.
             </p>
          </div>
        )}
      </main>

      {!uploading && (
        <footer className="p-8 pb-10">
          <button 
            onClick={handleUpload}
            disabled={files.length === 0}
            className="w-full bg-brand-charcoal text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:bg-brand-charcoal/90"
          >
            <CloudUploadIcon className="w-5 h-5 text-brand-peach" />
            <span>Upload {files.length} {files.length === 1 ? 'Moment' : 'Moments'}</span>
          </button>
        </footer>
      )}
    </div>
  );
}

function CloudUploadIcon(props: any) {
  return (
    <div {...props} className={cn("relative flex items-center justify-center", props.className)}>
       <Upload className="w-5 h-5" />
       <motion.div 
         animate={{ y: [-2, 2, -2] }}
         transition={{ repeat: Infinity, duration: 1.5 }}
         className="absolute -top-1 -right-1"
       >
         <Sparkles className="w-3 h-3 fill-current" />
       </motion.div>
    </div>
  )
}
