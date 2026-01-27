import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminAuthenticated } from './ui/PasswordModal';
import { PasswordModal } from './ui/PasswordModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setIsAuthenticated(true);
    } else {
      setShowModal(true);
    }
  }, []);

  const handleSuccess = () => {
    setShowModal(false);
    setIsAuthenticated(true);
  };

  const handleClose = () => {
    setShowModal(false);
    navigate('/');
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center h-96">
      <PasswordModal
        isOpen={showModal}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
