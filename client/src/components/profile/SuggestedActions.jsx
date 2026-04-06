import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

const SuggestedActions = ({ isOwnProfile }) => {
  const navigate = useNavigate();

  if (!isOwnProfile) return null;

  return (
    <div className="suggested-actions">
      <h3>🚀 Start building your first project</h3>
      <p>Your profile is looking a bit empty! Create your first project to start tracking your activity.</p>
      <div className="action-buttons">
        <Button onClick={() => navigate('/dashboard')}>
          Create Project
        </Button>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Explore Projects
        </Button>
      </div>
    </div>
  );
};

export default SuggestedActions;
