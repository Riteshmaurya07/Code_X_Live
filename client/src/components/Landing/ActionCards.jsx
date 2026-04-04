import React from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

/**
 * Handles Create and Join Room cards on the Landing Page
 */
const ActionCards = ({
  createRoomName,
  setCreateRoomName,
  selectedLanguage,
  setSelectedLanguage,
  languages,
  onCreateRoom,
  joinInput,
  setJoinInput,
  onJoinRoom
}) => {
  return (
    <section className="landing-actions-grid">
      {/* Create Room Card */}
      <div className="landing-card create-card">
        <div className="card-badge">Start Fresh</div>
        <h2>Create New Room</h2>
        <form onSubmit={onCreateRoom} className="landing-form">
          <Input 
            label="Room Name (Optional)"
            placeholder="e.g. React Bugfix Session" 
            value={createRoomName}
            onChange={(e) => setCreateRoomName(e.target.value)}
          />
          <div className="form-group">
            <label>Language</label>
            <div className="language-pills">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`lang-pill ${selectedLanguage === lang ? "active" : ""}`}
                  onClick={() => setSelectedLanguage(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" fullWidth className="mt-4">
            Create Room
          </Button>
        </form>
      </div>

      {/* Join Room Card */}
      <div className="landing-card join-card">
        <div className="card-badge join-badge">Collaboration</div>
        <h2>Join Existing Room</h2>
        <form onSubmit={onJoinRoom} className="landing-form mt-4">
          <Input 
            label="Invite Link or Room ID"
            placeholder="Paste invite link here" 
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
          />
          <Button variant="success" type="submit" fullWidth className="mt-auto">
            Join Room
          </Button>
        </form>
      </div>
    </section>
  );
};

export default ActionCards;
