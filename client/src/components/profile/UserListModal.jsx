import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFollowers, getFollowing, followUser, unfollowUser } from "../../services/userService";
import { useAuth } from "../../hooks/useAuth";
import Button from "../ui/Button";

const UserListModal = ({ type, username, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [type, username]);

  const fetchUsers = async (pageNum = 1) => {
    try {
      setLoading(true);
      let data = [];
      if (type === "followers") {
        data = await getFollowers(username, pageNum);
      } else {
        data = await getFollowing(username, pageNum);
      }
      
      if (pageNum === 1) {
        setUsers(data);
      } else {
        setUsers(prev => [...prev, ...data]);
      }
      
      if (data.length < 20) setHasMore(false);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetUserId, isCurrentlyFollowing) => {
    // Optimistic UI
    setUsers(prev => prev.map(u => 
      u._id === targetUserId ? { ...u, isFollowing: !isCurrentlyFollowing } : u
    ));

    try {
      if (isCurrentlyFollowing) {
        await unfollowUser(targetUserId);
      } else {
        await followUser(targetUserId);
      }
    } catch (err) {
      // Revert on error
      setUsers(prev => prev.map(u => 
        u._id === targetUserId ? { ...u, isFollowing: isCurrentlyFollowing } : u
      ));
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === "followers" ? "Followers" : "Following"}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body user-list">
          {users.map(u => (
            <div key={u._id} className="user-list-item">
              <div className="user-list-avatar" onClick={() => navigate(`/profile/${u.username}`)}>
                {u.avatar ? <img src={u.avatar} alt={u.username} /> : u.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-list-info" onClick={() => navigate(`/profile/${u.username}`)}>
                <div className="user-list-name">
                  {u.fullName || `@${u.username}`}
                  {u.isMutual && type === "followers" && <span className="mutual-badge">Follows you</span>}
                </div>
                <div className="user-list-username">@{u.username}</div>
              </div>
              <div className="user-list-action">
                {currentUser && currentUser.id !== u._id && (
                  <Button 
                    size="sm" 
                    variant={u.isFollowing ? "outline" : "primary"}
                    onClick={() => handleToggleFollow(u._id, u.isFollowing)}
                  >
                    {u.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="user-list-loading">
              <div className="spinner"></div>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="user-list-empty">
              No {type} found.
            </div>
          )}

          {!loading && hasMore && users.length > 0 && (
            <div className="user-list-load-more">
              <Button variant="ghost" size="sm" onClick={() => fetchUsers(page + 1)}>
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserListModal;
