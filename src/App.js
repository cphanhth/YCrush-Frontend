import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import "./index.css";

const BACKEND_URL = "https://ycrush-backend.onrender.com";

function Home() {
  const [token, setToken] = useState(localStorage.getItem("authToken"));
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Random profile
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState([]);
  const navigate = useNavigate();

  // Load token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) setToken(storedToken);
  }, []);

  // Fetch user and random profile on token
  useEffect(() => {
    if (token) {
      fetchUser();
      fetchProfile();
    }
  }, [token]);

  // Real-time search effect
  useEffect(() => {
    const fetchSearch = async () => {
      if (!searchInput.trim()) return setSearchResults([]);
      try {
        const res = await axios.get(
          `${BACKEND_URL}/profiles/search?q=${encodeURIComponent(searchInput)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("❌ Search error:", err);
      }
    };
    fetchSearch();
  }, [searchInput, token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error("❌ /me error:", err);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/profiles/random`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(res.data);
      setCurrentIndex(0);
    } catch (err) {
      console.error("❌ /profiles/random error:", err);
    }
  };

  const nextProfile = () => {
    fetchProfile(); // Just get another random one
  };

  const likeProfile = async (targetProfile) => {
    if (!token || !targetProfile) return;
    try {
      const res = await axios.post(
        `${BACKEND_URL}/like/${targetProfile._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.message === "It's a match!") {
        setMatches([...matches, targetProfile]);
      }
    } catch (err) {
      console.error("❌ Like error:", err);
    }
  };

  const login = () => {
    window.location.href = `${BACKEND_URL}/auth/cas/token`;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setToken(null);
    setUser(null);
    navigate("/");
  };

  return (
    <div className="app">
      <h1 className="title">YCrush 💖</h1>
      {user ? (
        <>
          <div className="user-box">
            <p>
              Logged in as:{" "}
              <strong>
                {user.firstName} {user.lastName}
              </strong>
            </p>
          </div>
          <button onClick={logout} className="btn btn-logout">
            Logout
          </button>

          <input
            type="text"
            placeholder="Search by exact name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="matches">
              <h2>Search Results</h2>
              {searchResults.map((match) => (
                <div key={match._id} className="match-box">
                  <img
                    src={match.photo || "https://picsum.photos/50"}
                    alt="Match"
                    className="match-photo"
                  />
                  <div>
                    <p>
                      <strong>{match.firstName} {match.lastName}</strong>
                    </p>
                    <p>{match.college}</p>
                  </div>
                  <button
                    className="btn btn-like"
                    onClick={() => likeProfile(match)}
                  >
                    Like
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Random Profile Section */}
          <div className="profile-card">
            {profile ? (
              <>
                <img
                  src={profile.photo || "https://picsum.photos/150"}
                  alt="Profile"
                  className="profile-photo"
                />
                <h2>
                  {profile.firstName} {profile.lastName}, {profile.year}
                </h2>
                <p>{profile.college}</p>
                <div className="btn-row">
                  <button className="btn btn-like" onClick={() => likeProfile(profile)}>
                    Like
                  </button>
                  <button className="btn btn-skip" onClick={nextProfile}>
                    Next
                  </button>
                </div>
              </>
            ) : (
              <p>Loading profile...</p>
            )}
          </div>

          {/* Matches */}
          <h2>Your Matches</h2>
          <div className="matches">
            {matches.length > 0 ? (
              matches.map((match, i) => (
                <div key={i} className="match-box">
                  <img
                    src={match.photo || "https://picsum.photos/50"}
                    alt="Match"
                    className="match-photo"
                  />
                  <p>{match.firstName} {match.lastName}</p>
                </div>
              ))
            ) : (
              <p>No matches yet.</p>
            )}
          </div>
        </>
      ) : (
        <button onClick={login} className="btn btn-login">
          Login with Yale CAS
        </button>
      )}
    </div>
  );
}

function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const token = query.get("token");
    if (token) {
      localStorage.setItem("authToken", token);
      navigate("/");
    } else {
      console.error("❌ No token found in callback");
    }
  }, [location, navigate]);

  return <p>Logging in...</p>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthCallback />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App;
