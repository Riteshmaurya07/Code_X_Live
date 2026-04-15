import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getUserProfile, followUser, unfollowUser,
  getActivityDashboard, uploadAvatar, updateProfile,
} from "../services/userService";
import Navbar from "../components/layout/Navbar";
import Button from "../components/ui/Button";
import UserListModal from "../components/profile/UserListModal";
import ActivityDashboard from "../components/profile/ActivityDashboard";
import { useAuth } from "../hooks/useAuth";
import { useDM } from "../hooks/useDM";
import ProjectCard from "../components/Dashboard/ProjectCard";
import toast from "react-hot-toast";

function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { openDM } = useDM();
  const fileInputRef = useRef(null);
  const [profileData, setProfileData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowingPending, setIsFollowingPending] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isOwnProfile = currentUser?.username === username;
  const listType = location.pathname.endsWith("/followers") ? 'followers' : 
                   location.pathname.endsWith("/following") ? 'following' : null;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profData, dashData] = await Promise.all([
          getUserProfile(username),
          getActivityDashboard(username)
        ]);
        setProfileData(profData);
        setDashboardData(dashData);
        setAvatarUrl(profData?.profile?.avatar || '');
        if (currentUser && profData?.profile?.followers) {
          setIsFollowing(profData.profile.followers.some(follower => 
            (follower._id || follower) === currentUser.id 
            || (follower._id || follower) === currentUser._id
          ));
        }
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load profile");
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username, navigate, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser) return navigate("/login");
    setIsFollowingPending(true);
    try {
      if (isFollowing) {
        await unfollowUser(profileData.profile.id);
        setIsFollowing(false);
        setProfileData(prev => ({
          ...prev, 
          profile: { ...prev.profile, followers: prev.profile.followers.filter(id => id !== currentUser.id) }
        }));
      } else {
        await followUser(profileData.profile.id);
        setIsFollowing(true);
        setProfileData(prev => ({
          ...prev, 
          profile: { ...prev.profile, followers: [...prev.profile.followers, currentUser.id] }
        }));
      }
    } catch (err) {
      toast.error("Failed to update follow status");
    } finally {
      setIsFollowingPending(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
    setIsUploadingAvatar(true);
    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(result.avatar);
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
      setAvatarUrl(profileData?.profile?.avatar || '');
    } finally {
      setIsUploadingAvatar(false);
      // reset input so same file can be re-selected
      e.target.value = '';
    }
  };
  return (
    <div className="dashboard-page profile-page">
      <Navbar variant="dashboard" />
      
      <div className="dashboard-content">
        {loading ? (
          <div className="loading-state">Loading profile...</div>
        ) : profileData ? (
          <>
            <div className="profile-header">
              <div
                className={`profile-avatar ${isOwnProfile ? 'profile-avatar--editable' : ''}`}
                onClick={() => isOwnProfile && fileInputRef.current?.click()}
                title={isOwnProfile ? 'Click to change photo' : ''}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                  : profileData.profile.username.charAt(0).toUpperCase()
                }
                {isOwnProfile && (
                  <div className="profile-avatar-overlay">
                    {isUploadingAvatar ? '⏳' : '📷'}
                  </div>
                )}
              </div>
              {/* Hidden file input */}
              {isOwnProfile && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              )}
              <div className="profile-info" style={{ flex: 1 }}>
                <h1 className="profile-name">
                  {profileData.profile.fullName || `@${profileData.profile.username}`}
                </h1>
                <p className="profile-meta">@{profileData.profile.username}</p>
                
                <div className="profile-stats">
                  <span className="profile-stat-link" onClick={() => navigate(`/profile/${username}/followers`)}>
                    <strong>{profileData.profile.followers?.length || 0}</strong> Followers
                  </span>
                  <span className="profile-stat-link" onClick={() => navigate(`/profile/${username}/following`)}>
                    <strong>{profileData.profile.following?.length || 0}</strong> Following
                  </span>
                </div>
              </div>
              <div className="profile-actions">
                {isOwnProfile ? (
                  <Button variant="outline">Edit Profile</Button>
                ) : (
                  <>
                    <Button 
                      variant={isFollowing ? "outline" : "primary"}
                      onClick={handleFollowToggle}
                      disabled={isFollowingPending}
                    >
                      {isFollowing ? "Unfollow" : "Follow"}
                    </Button>
                    <button
                      className="dm-message-profile-btn"
                      onClick={() => openDM({
                        _id: profileData.profile.id || profileData.profile._id,
                        username: profileData.profile.username,
                        fullName: profileData.profile.fullName,
                        avatar: profileData.profile.avatar,
                      })}
                      title={`Message @${profileData.profile.username}`}
                    >
                      💬 Message
                    </button>
                  </>
                )}
              </div>
            </div>

            <ActivityDashboard data={dashboardData} isOwnProfile={isOwnProfile} />

            <h2 style={{ margin: "2rem 0 1rem 0" }}>Public Projects</h2>

            {profileData.publicProjects.length === 0 ? (
              <div className="empty-state">
                <h3>No public projects</h3>
                <p>@{profileData.profile.username} hasn't published any public projects yet.</p>
              </div>
            ) : (
              <div className="projects-grid">
                {profileData.publicProjects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onOpen={(p) => navigate(`/editor/${p.roomId || p._id}`, {
                      state: { username: profileData.profile.username, projectId: p._id },
                    })}
                    onShare={() => toast.error("You cannot share someone else's public project")}
                    onDelete={() => toast.error("You cannot delete someone else's public project")}
                  />
                ))}
              </div>
            )}

            {/* Modals */}
            {listType && (
              <UserListModal 
                type={listType} 
                username={username} 
                onClose={() => navigate(`/profile/${username}`)} 
              />
            )}
          </>
        ) : (
          <div className="empty-state">
            <h3>Profile not found</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;
