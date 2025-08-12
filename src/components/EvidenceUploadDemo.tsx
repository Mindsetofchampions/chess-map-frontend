@@ .. @@
 import React, { useState, useRef } from 'react';
+import { motion, AnimatePresence } from 'framer-motion';
 import { useAuth } from '../contexts/AuthContext';
-import { uploadQuestEvidence, getEvidenceSignedUrl } from '../services/evidenceService';
+import { 
+  uploadQuestEvidence, 
+  getUserEvidence, 
+  getEvidenceSignedUrl, 
+  deleteEvidence,
+  getEvidenceStats
+} from '../services/evidenceService';
+import { QuestEvidence } from '../types';
+import { 
+  Upload, 
+  File, 
+  Image, 
+  Video, 
+  FileText, 
+  Trash2, 
+  Eye,
+  Download,
+  Calendar
+} from 'lucide-react';

+/**
+ * Props for EvidenceUploadDemo component
+ */
+interface EvidenceUploadDemoProps {
+  userId?: string;
+  questId?: string;
+  className?: string;
+}
+
+/**
+ * Props for EvidenceItem component
+ */
+interface EvidenceItemProps {
+  evidence: QuestEvidence;
+  onDelete: (id: string) => void;
+}
+
+/**
+ * Individual Evidence Item Component
+ */
+const EvidenceItem: React.FC<EvidenceItemProps> = ({ evidence, onDelete }) => {
+  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
+  const [loading, setLoading] = useState(false);
+  const [showPreview, setShowPreview] = useState(false);
+
+  const loadPreview = async () => {
+    const fileExtension = evidence.url.split('.').pop()?.toLowerCase();
+    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
+    
+    if (isImage) {
+      setLoading(true);
+      const signedUrl = await getEvidenceSignedUrl(evidence.url, 3600);
+      setPreviewUrl(signedUrl);
+      setLoading(false);
+    }
+  };
+
+  React.useEffect(() => {
+    loadPreview();
+  }, [evidence]);
+
+  const handleDelete = async () => {
+    if (confirm('Are you sure you want to delete this evidence?')) {
+      const success = await deleteEvidence(evidence.id, evidence.user_id);
+      if (success) {
+        onDelete(evidence.id);
+      } else {
+        alert('Failed to delete evidence');
+      }
+    }
+  };
+
+  const getFileIcon = (url: string): React.ReactNode => {
+    const extension = url.split('.').pop()?.toLowerCase();
+    
+    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
+      return <Image className="w-5 h-5 text-electric-blue-400" />;
+    }
+    if (['mp4', 'webm', 'mov'].includes(extension || '')) {
+      return <Video className="w-5 h-5 text-neon-purple-400" />;
+    }
+    if (extension === 'pdf') {
+      return <FileText className="w-5 h-5 text-red-400" />;
+    }
+    return <File className="w-5 h-5 text-gray-400" />;
+  };
+
+  const getFileName = (url: string): string => {
+    const parts = url.split('/');
+    const fullName = parts[parts.length - 1];
+    // Remove timestamp prefix (e.g., "1234567890_filename.jpg" -> "filename.jpg")
+    return fullName.replace(/^\d+_/, '');
+  };
+
+  return (
+    <motion.div
+      className="bg-glass border-glass rounded-xl p-4 hover:bg-glass-dark transition-all duration-300"
+      initial={{ opacity: 0, scale: 0.95 }}
+      animate={{ opacity: 1, scale: 1 }}
+      whileHover={{ scale: 1.02 }}
+    >
+      <div className="flex items-start justify-between mb-3">
+        <div className="flex items-center space-x-3 flex-1">
+          {getFileIcon(evidence.url)}
+          <div className="min-w-0 flex-1">
+            <h4 className="font-medium text-white truncate">
+              {getFileName(evidence.url)}
+            </h4>
+            <p className="text-sm text-gray-300">
+              {new Date(evidence.created_at).toLocaleDateString()}
+            </p>
+          </div>
+        </div>
+        
+        <div className="flex items-center gap-1">
+          {previewUrl && (
+            <button
+              onClick={() => setShowPreview(!showPreview)}
+              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-glass-dark min-w-touch min-h-touch touch-manipulation"
+              title="Toggle preview"
+            >
+              <Eye className="w-4 h-4" />
+            </button>
+          )}
+          
+          <button
+            onClick={handleDelete}
+            className="p-2 text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-red-500/20 min-w-touch min-h-touch touch-manipulation"
+            title="Delete evidence"
+          >
+            <Trash2 className="w-4 h-4" />
+          </button>
+        </div>
+      </div>

+      {/* Preview */}
+      <AnimatePresence>
+        {showPreview && previewUrl && (
+          <motion.div
+            className="mt-3"
+            initial={{ opacity: 0, height: 0 }}
+            animate={{ opacity: 1, height: 'auto' }}
+            exit={{ opacity: 0, height: 0 }}
+          >
+            {loading ? (
+              <div className="bg-glass-light rounded-lg h-32 flex items-center justify-center">
+                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-electric-blue-400"></div>
+              </div>
+            ) : (
+              <img
+                src={previewUrl}
+                alt={getFileName(evidence.url)}
+                className="w-full h-32 object-cover rounded-lg border border-glass"
+                onError={() => setPreviewUrl(null)}
+              />
+            )}
+          </motion.div>
+        )}
+      </AnimatePresence>

+      {/* Quest Badge */}
+      {evidence.quest_id && (
+        <div className="mt-3">
+          <span className="inline-flex items-center gap-1 text-xs bg-electric-blue-500/20 border border-electric-blue-500/30 text-electric-blue-300 px-2 py-1 rounded-full">
+            <Calendar className="w-3 h-3" />
+            Quest Evidence
+          </span>
+        </div>
+      )}
+    </motion.div>
+  );
+};

+/**
+ * Evidence Upload Demo Component
+ * 
+ * Features:
+ * - Drag and drop file upload
+ * - File validation and security checks
+ * - Preview for image files
+ * - Evidence management (view, delete)
+ * - Progress tracking and statistics
+ */
 export default function EvidenceUploadDemo() {
-  const { user } = useAuth(); // expects { id } on user
+  const { user } = useAuth();
   const [file, setFile] = useState<File | null>(null);
-  const [status, setStatus] = useState<string>('');
-  const [previewUrl, setPreviewUrl] = useState<string>('');
+  const [uploading, setUploading] = useState(false);
+  const [evidence, setEvidence] = useState<QuestEvidence[]>([]);
+  const [loading, setLoading] = useState(true);
+  const [dragOver, setDragOver] = useState(false);
+  const [uploadStatus, setUploadStatus] = useState<string>('');
+  const fileInputRef = useRef<HTMLInputElement>(null);
+
+  /**
+   * Load user's evidence on mount
+   */
+  const loadEvidence = useCallback(async () => {
+    if (!user?.id) return;
+    
+    setLoading(true);
+    const userEvidence = await getUserEvidence(user.id);
+    setEvidence(userEvidence);
+    setLoading(false);
+  }, [user?.id]);
+
+  useEffect(() => {
+    loadEvidence();
+  }, [loadEvidence]);

+  /**
+   * Handle file upload
+   */
+  const handleFileUpload = useCallback(async (files: FileList | null) => {
+    if (!files || files.length === 0 || !user?.id) return;

+    setUploading(true);
+    setUploadStatus('');
+    const selectedFile = files[0];

+    try {
+      const result = await uploadQuestEvidence({
+        file: selectedFile,
+        userId: user.id,
+        questId: undefined // Could be passed as prop for specific quests
+      });

+      if (result.success && result.evidence) {
+        setEvidence(prev => [result.evidence!, ...prev]);
+        setUploadStatus('✅ Upload successful!');
+        
+        // Clear status after 3 seconds
+        setTimeout(() => setUploadStatus(''), 3000);
+      } else {
+        setUploadStatus(`❌ ${result.error || 'Upload failed'}`);
+      }
+    } catch (error: any) {
+      console.error('Upload error:', error);
+      setUploadStatus(`❌ ${error.message || 'Upload failed'}`);
+    } finally {
+      setUploading(false);
+      if (fileInputRef.current) {
+        fileInputRef.current.value = '';
+      }
+    }
+  }, [user?.id]);

+  /**
+   * Drag and drop handlers
+   */
+  const handleDrop = useCallback((e: React.DragEvent) => {
+    e.preventDefault();
+    setDragOver(false);
+    handleFileUpload(e.dataTransfer.files);
+  }, [handleFileUpload]);

+  const handleDragOver = useCallback((e: React.DragEvent) => {
+    e.preventDefault();
+    setDragOver(true);
+  }, []);

+  const handleDragLeave = useCallback((e: React.DragEvent) => {
+    e.preventDefault();
+    setDragOver(false);
+  }, []);

+  /**
+   * Handle evidence deletion
+   */
+  const handleDeleteEvidence = useCallback((evidenceId: string) => {
+    setEvidence(prev => prev.filter(e => e.id !== evidenceId));
+  }, []);

+  if (!user) {
+    return (
+      <div className="bg-glass border-glass rounded-xl p-6 text-center">
+        <p className="text-gray-300">Please sign in to upload evidence.</p>
+      </div>
+    );
+  }

   return (
-    <div className="p-4 border rounded-xl">
-      <div className="font-semibold mb-2">Upload Evidence (demo)</div>
-      <input
-        type="file"
-        onChange={(e) => setFile(e.target.files?.[0] || null)}
-        className="mb-2"
-      />
-      <button
-        className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
-        disabled={!file || !user?.id}
-        onClick={async () => {
-          try {
-            setStatus('Uploading...');
-            const res = await uploadQuestEvidence({ file: file!, userId: user!.id });
-            setStatus(`Saved row ${res.id}`);
-            const url = await getEvidenceSignedUrl(res.path, 300);
-            setPreviewUrl(url);
-          } catch (e: any) {
-            setStatus(e.message || 'Upload failed');
-          }
-        }}
-      >
-        Upload
-      </button>
+    <div className="max-w-4xl mx-auto p-4">
+      {/* Header */}
+      <motion.div
+        className="mb-8"
+        initial={{ opacity: 0, y: 20 }}
+        animate={{ opacity: 1, y: 0 }}
+        transition={{ duration: 0.5 }}
+      >
+        <h2 className="text-3xl font-bold text-white mb-2">Evidence Upload</h2>
+        <p className="text-gray-200">Upload images, videos, or documents as quest evidence to track your learning progress.</p>
+      </motion.div>

-      {status && <div className="mt-2 text-sm">{status}</div>}
-      {previewUrl && (
-        <div className="mt-3">
-          <div className="text-sm mb-1">Preview (5 min link):</div>
-          <img src={previewUrl} alt="evidence" className="max-w-xs rounded" />
+      {/* Upload Area */}
+      <motion.div
+        className={`border-2 border-dashed rounded-2xl p-8 text-center mb-8 transition-all duration-300 ${
+          dragOver
+            ? 'border-electric-blue-400 bg-electric-blue-500/10'
+            : uploading
+            ? 'border-gray-500 bg-gray-500/10'
+            : 'border-glass hover:border-gray-400 bg-glass'
+        }`}
+        onDrop={handleDrop}
+        onDragOver={handleDragOver}
+        onDragLeave={handleDragLeave}
+        initial={{ opacity: 0, y: 20 }}
+        animate={{ opacity: 1, y: 0 }}
+        transition={{ duration: 0.5, delay: 0.1 }}
+      >
+        <AnimatePresence mode="wait">
+          {uploading ? (
+            <motion.div
+              key="uploading"
+              className="flex flex-col items-center"
+              initial={{ opacity: 0 }}
+              animate={{ opacity: 1 }}
+              exit={{ opacity: 0 }}
+            >
+              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mb-4"></div>
+              <p className="text-lg font-medium text-white">Uploading Evidence...</p>
+              <p className="text-sm text-gray-300 mt-2">Please wait while we securely store your file</p>
+            </motion.div>
+          ) : (
+            <motion.div
+              key="upload-area"
+              initial={{ opacity: 0 }}
+              animate={{ opacity: 1 }}
+              exit={{ opacity: 0 }}
+            >
+              <div className="w-20 h-20 bg-glass-dark border-glass-dark rounded-full flex items-center justify-center mx-auto mb-6">
+                <Upload className="w-10 h-10 text-electric-blue-400" />
+              </div>
+              <h3 className="text-xl font-semibold text-white mb-2">
+                Drop files here or click to upload
+              </h3>
+              <p className="text-gray-200 mb-4">
+                Supports images, videos, PDFs, and text files (max 10MB)
+              </p>
+              
+              <motion.button
+                onClick={() => fileInputRef.current?.click()}
+                className="btn-esports mx-auto"
+                whileHover={{ scale: 1.05 }}
+                whileTap={{ scale: 0.95 }}
+              >
+                Choose Files
+              </motion.button>
+              
+              <input
+                ref={fileInputRef}
+                type="file"
+                onChange={(e) => handleFileUpload(e.target.files)}
+                accept="image/*,video/*,application/pdf,text/plain"
+                className="hidden"
+              />
+              
+              <div className="mt-4 text-xs text-gray-400">
+                <div className="flex items-center justify-center gap-4">
+                  <span>Images: JPG, PNG, GIF</span>
+                  <span>•</span>
+                  <span>Videos: MP4, WebM</span>
+                  <span>•</span>
+                  <span>Docs: PDF, TXT</span>
+                </div>
+              </div>
+            </motion.div>
+          )}
+        </AnimatePresence>
+      </motion.div>
+
+      {/* Upload Status */}
+      <AnimatePresence>
+        {uploadStatus && (
+          <motion.div
+            className={`mb-6 p-4 rounded-xl border ${
+              uploadStatus.includes('✅') 
+                ? 'bg-cyber-green-500/20 border-cyber-green-500/30 text-cyber-green-300'
+                : 'bg-red-500/20 border-red-500/30 text-red-300'
+            }`}
+            initial={{ opacity: 0, scale: 0.95 }}
+            animate={{ opacity: 1, scale: 1 }}
+            exit={{ opacity: 0, scale: 0.95 }}
+          >
+            <p className="text-center font-medium">{uploadStatus}</p>
+          </motion.div>
+        )}
+      </AnimatePresence>

+      {/* Evidence List */}
+      <motion.div
+        initial={{ opacity: 0, y: 20 }}
+        animate={{ opacity: 1, y: 0 }}
+        transition={{ duration: 0.5, delay: 0.3 }}
+      >
+        <div className="flex items-center justify-between mb-6">
+          <h3 className="text-xl font-semibold text-white">
+            Your Evidence ({evidence.length})
+          </h3>
+          
+          {evidence.length > 0 && (
+            <motion.button
+              onClick={loadEvidence}
+              className="flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg px-3 py-2 text-sm transition-all duration-200 min-h-touch touch-manipulation"
+              whileHover={{ scale: 1.02 }}
+              whileTap={{ scale: 0.98 }}
+            >
+              <Download className="w-4 h-4" />
+              Refresh
+            </motion.button>
+          )}
         </div>
-      )}
+
+        {loading ? (
+          <div className="flex items-center justify-center py-12">
+            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue-400"></div>
+            <span className="ml-3 text-gray-300">Loading evidence...</span>
+          </div>
+        ) : evidence.length === 0 ? (
+          <motion.div
+            className="text-center py-12 bg-glass border-glass rounded-xl"
+            initial={{ opacity: 0 }}
+            animate={{ opacity: 1 }}
+          >
+            <div className="w-16 h-16 bg-glass-dark border-glass-dark rounded-full flex items-center justify-center mx-auto mb-4">
+              <File className="w-8 h-8 text-gray-400" />
+            </div>
+            <h3 className="text-lg font-semibold text-white mb-2">No Evidence Yet</h3>
+            <p className="text-gray-300">Upload your first file above to start building your evidence portfolio!</p>
+          </motion.div>
+        ) : (
+          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
+            {evidence.map((item, index) => (
+              <motion.div
+                key={item.id}
+                initial={{ opacity: 0, y: 20 }}
+                animate={{ opacity: 1, y: 0 }}
+                transition={{ duration: 0.3, delay: index * 0.05 }}
+              >
+                <EvidenceItem
+                  evidence={item}
+                  onDelete={handleDeleteEvidence}
+                />
+              </motion.div>
+            ))}
+          </div>
+        )}
+      </motion.div>
     </div>
   );
-}
+};