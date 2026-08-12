import React, { useRef, useState } from 'react';
import { Button, Spinner, Modal } from 'react-bootstrap';
import toast from 'react-hot-toast';
import DefaultAvatar from './DefaultAvatar';

interface ProfilePhotoProps {
  /** Current photo URL (or null/undefined for default avatar) */
  photoURL?: string | null;
  /** Size in pixels. Defaults to 120. */
  size?: number;
  /** Whether to show the upload/change button. Defaults to false. */
  editable?: boolean;
  /** Callback when a new photo is selected. Receives the File. */
  onPhotoSelected?: (file: File) => void;
  /** Callback when the user removes the existing photo. */
  onPhotoRemoved?: () => void;
  /** Whether an upload is currently in progress. */
  uploading?: boolean;
  /** Additional CSS class names for the wrapper. */
  className?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Displays a user's profile photo (or default avatar) with an optional
 * "Change Photo" button for editing.
 */
const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  photoURL,
  size = 120,
  editable = false,
  onPhotoSelected,
  onPhotoRemoved,
  uploading = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Please select a JPG, PNG, or WebP image.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be smaller than 5 MB.');
      return;
    }

    // Create a preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewURL(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Notify parent
    onPhotoSelected?.(file);

    // Reset the input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const rawDisplayURL = previewURL || photoURL;
  
  // If it's a Cloudinary URL, use their API to perfectly center on the face 
  // and scale it down to 400x400 (Retina ready for a 150px circle) to prevent browser blurring
  const displayURL = rawDisplayURL?.includes('cloudinary.com') && rawDisplayURL.includes('/upload/')
    ? rawDisplayURL.replace('/upload/', '/upload/c_fill,g_face,w_400,h_400,q_auto,f_auto/')
    : rawDisplayURL;

  return (
    <div className={`text-center ${className}`}>
      <div
        className="position-relative d-inline-block"
        style={{ width: size, height: size }}
      >
        {displayURL ? (
          <img
            src={displayURL}
            alt="Profile photo"
            className="rounded-circle border shadow-sm"
            style={{
              width: size,
              height: size,
              objectFit: 'cover',
            }}
          />
        ) : (
          <DefaultAvatar
            size={size}
            className="rounded-circle border shadow-sm"
          />
        )}

        {uploading && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-circle"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <Spinner animation="border" size="sm" variant="light" />
          </div>
        )}
      </div>

      {editable && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="d-none"
          />
          <div className="mt-2 d-flex gap-2 justify-content-center">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <i className="bi bi-camera me-1"></i>
              {photoURL || previewURL ? 'Change Photo' : 'Add Photo'}
            </Button>
            {(photoURL || previewURL) && onPhotoRemoved && (
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={uploading}
              >
                <i className="bi bi-trash me-1"></i>
                Remove
              </Button>
            )}
          </div>
        </>
      )}

      <Modal show={showConfirm} onHide={() => setShowConfirm(false)} centered size="sm">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Confirm Removal</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-start">
          Are you sure you want to remove this profile photo?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setPreviewURL(null);
              setShowConfirm(false);
              onPhotoRemoved?.();
            }}
          >
            Yes, Remove
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProfilePhoto;
