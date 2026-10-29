import { useEffect, useState } from 'react';
import './App.css';

const API = 'http://localhost:5000/api';

function App() {
  const [page, setPage] = useState('signup');
  const [pets, setPets] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [formPet, setFormPet] = useState(null);

  const [userToken, setUserToken] = useState(
    () => localStorage.getItem('pawpalUserToken') || ''
  );
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });

  const [adminData, setAdminData] = useState({
    username: '',
    password: ''
  });

  const [adminToken, setAdminToken] = useState('');
  const [adoptions, setAdoptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adoptionsLoading, setAdoptionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  // Verify saved user session
  useEffect(() => {
    let active = true;

    async function verifySession() {
      if (!userToken) {
        if (active) {
          setAuthChecking(false);
          setPage('signup');
        }
        return;
      }

      try {
        const response = await fetch(`${API}/auth/me`, {
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error('Session expired. Please login again.');
        }

        if (active) {
          setUser(data.user);
          setPage('home');
        }
      } catch {
        localStorage.removeItem('pawpalUserToken');

        if (active) {
          setUserToken('');
          setUser(null);
          setPage('login');
        }
      } finally {
        if (active) setAuthChecking(false);
      }
    }

    verifySession();

    return () => {
      active = false;
    };
  }, []);

  // Fetch pets
  useEffect(() => {
    async function fetchPets() {
      try {
        const response = await fetch(`${API}/pets`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load pets.');
        }

        setPets(data);
        setError('');
      } catch (err) {
        setError(err.message || 'Unable to load pets.');
      } finally {
        setLoading(false);
      }
    }

    fetchPets();
  }, []);

  // Sign up
  async function handleSignup(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setAuthError('');

    try {
      const response = await fetch(`${API}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sign up failed.');
      }

      setLoginData({
        email: signupData.email.trim(),
        password: ''
      });

      setSignupData({ name: '', email: '', password: '' });
      setAuthError('');
      setMessage('Account created successfully! Please login.');
      setPage('login');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // User login
  async function handleLogin(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setAuthError('');

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      localStorage.setItem('pawpalUserToken', data.token);
      setUserToken(data.token);
      setUser(data.user);
      setLoginData({ email: '', password: '' });
      setPage('home');
      setMessage(`Welcome to PawPal, ${data.user.name}!`);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // User logout
  function handleLogout() {
    localStorage.removeItem('pawpalUserToken');
    setUserToken('');
    setUser(null);
    setSelected(null);
    setFormPet(null);
    setMessage('');
    setAuthError('');
    setPage('login');
  }

  // Admin login
  async function handleAdminLogin(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setAuthError('');

    try {
      const response = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid admin credentials.');
      }

      setAdminToken(data.token);
      setAdminData({ username: '', password: '' });
      await loadAdoptions(data.token);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Fetch admin adoption requests
  async function loadAdoptions(token = adminToken) {
    if (!token) return;

    setAdoptionsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API}/adoptions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load requests.');
      }

      setAdoptions(data);
      setPage('adminDashboard');
    } catch (err) {
      setError(err.message);

      if (
        err.message.toLowerCase().includes('session') ||
        err.message.toLowerCase().includes('login')
      ) {
        setAdminToken('');
      }
    } finally {
      setAdoptionsLoading(false);
    }
  }

  function handleAdminLogout() {
    setAdminToken('');
    setAdoptions([]);
    setError('');
    setAuthError('');
    setPage('adminLogin');
  }

  // Update adoption status
  async function updateStatus(id, status) {
    setUpdatingId(id);
    setError('');

    try {
      const response = await fetch(`${API}/adoptions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to update status.');
      }

      setAdoptions(previous =>
        previous.map(item =>
          item._id === id
            ? { ...item, ...data.adoption }
            : item
        )
      );

      setMessage('Adoption status updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId('');
    }
  }

  // Submit adoption request
  async function submitAdoption(e) {
    e.preventDefault();

    if (!formPet || submitting) return;

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName').toString().trim();
    const email = formData.get('email').toString().trim();
    const reason = formData.get('reason').toString().trim();

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch(`${API}/adoptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          petId: formPet._id,
          fullName,
          email,
          reason
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit request.');
      }

      setFormPet(null);
      setSelected(null);
      setMessage(data.message || 'Adoption request submitted!');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredPets = pets.filter(pet => {
    const matchesType = filter === 'All' || pet.type === filter;
    const text = `${pet.name || ''} ${pet.breed || ''}`.toLowerCase();
    return matchesType && text.includes(search.toLowerCase());
  });

  const statusStyle = status => ({
    display: 'inline-block',
    padding: '5px 11px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    background:
      status === 'Approved'
        ? '#dcfce7'
        : status === 'Rejected'
          ? '#fee2e2'
          : '#fef3c7',
    color:
      status === 'Approved'
        ? '#166534'
        : status === 'Rejected'
          ? '#991b1b'
          : '#92400e'
  });

  if (authChecking) {
    return <div className="app"><p className="empty">Checking your session...</p></div>;
  }

  return (
    <div className="app">
      {/* AUTHENTICATION PAGES */}
      {['signup', 'login', 'adminLogin'].includes(page) && (
        <section
          className="authLayout"
        >
          <div
            className="authCard"
          >
            <a
              href="#"
              className="logo"
              onClick={e => {
                e.preventDefault();
                setPage('signup');
                setAuthError('');
              }}
            >
              🐾 Paw<span>Pal</span>
            </a>

            <p className="eyebrow" style={{ marginTop: '28px' }}>
              {page === 'adminLogin'
                ? 'PAWPAL ADMIN'
                : 'FIND YOUR FOREVER FRIEND'}
            </p>

            <h1 style={{ marginBottom: '10px' }}>
              {page === 'signup'
                ? 'Create Account'
                : page === 'login'
                  ? 'Welcome Back!'
                  : 'Admin Login 🔐'}
            </h1>

            <p style={{ marginBottom: '25px', color: '#666' }}>
              {page === 'signup'
                ? 'Sign up to start your pet adoption journey.'
                : page === 'login'
                  ? 'Login to meet your new best friend.'
                  : 'Login to manage adoption applications.'}
            </p>

            {page === 'signup' && (
              <form onSubmit={handleSignup}>
                <label className="authLabel">
                  Full Name
                  <input
                    value={signupData.name}
                    onChange={e =>
                      setSignupData({ ...signupData, name: e.target.value })
                    }
                    placeholder="Enter your full name"
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="authLabel">
                  Email Address
                  <input
                    type="email"
                    value={signupData.email}
                    onChange={e =>
                      setSignupData({ ...signupData, email: e.target.value })
                    }
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="authLabel">
                  Password
                  <input
                    type="password"
                    value={signupData.password}
                    onChange={e =>
                      setSignupData({ ...signupData, password: e.target.value })
                    }
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </label>

                {authError && <p className="authError">{authError}</p>}

                <button className="primaryButton authSubmit" disabled={busy}>
                  {busy ? 'Creating account...' : 'Sign Up'}
                </button>

                <p className="authSwitch">
                  Already have an account?{' '}
                  <button type="button" onClick={() => {
                    setPage('login');
                    setAuthError('');
                  }}>
                    Login
                  </button>
                </p>
              </form>
            )}

            {page === 'login' && (
              <form onSubmit={handleLogin}>
                <label className="authLabel">
                  Email Address
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={e =>
                      setLoginData({ ...loginData, email: e.target.value })
                    }
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="authLabel">
                  Password
                  <input
                    type="password"
                    value={loginData.password}
                    onChange={e =>
                      setLoginData({ ...loginData, password: e.target.value })
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {authError && <p className="authError">{authError}</p>}

                <button className="primaryButton authSubmit" disabled={busy}>
                  {busy ? 'Logging in...' : 'Login'}
                </button>

                <p className="authSwitch">
                  Don't have an account?{' '}
                  <button type="button" onClick={() => {
                    setPage('signup');
                    setAuthError('');
                  }}>
                    Sign Up
                  </button>
                </p>
              </form>
            )}

            {page === 'adminLogin' && (
              <form onSubmit={handleAdminLogin}>
                <label className="authLabel">
                  Admin Username
                  <input
                    value={adminData.username}
                    onChange={e =>
                      setAdminData({ ...adminData, username: e.target.value })
                    }
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="authLabel">
                  Admin Password
                  <input
                    type="password"
                    value={adminData.password}
                    onChange={e =>
                      setAdminData({ ...adminData, password: e.target.value })
                    }
                    autoComplete="current-password"
                    required
                  />
                </label>

                {authError && <p className="authError">{authError}</p>}

                <button className="primaryButton authSubmit" disabled={busy}>
                  {busy ? 'Logging in...' : 'Admin Login'}
                </button>
              </form>
            )}

            <div style={{ marginTop: '25px', textAlign: 'center' }}>
              {page !== 'adminLogin' ? (
                <button
                  type="button"
                  className="detailsButton"
                  onClick={() => {
                    setPage('adminLogin');
                    setAuthError('');
                    setMessage('');
                  }}
                >
                  Admin Login
                </button>
              ) : (
                <button
                  type="button"
                  className="detailsButton"
                  onClick={() => {
                    setPage('login');
                    setAuthError('');
                  }}
                >
                  ← Back to User Login
                </button>
              )}
            </div>
          </div>
          <aside className="authAnimalCard">
            <img
              src="https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&q=85"
              alt="A cat waiting to meet its new family"
            />
            <p>Meet a friend who can’t wait to come home.</p>
          </aside>
        </section>
      )}

      {/* USER HOME PAGE */}
      {page === 'home' && user && (
        <>
          <nav className="navbar">
            <a href="#home" className="logo">
              🐾 Paw<span>Pal</span>
            </a>

            <div className="navlinks">
              <a href="#home">Home</a>
              <a href="#pets">Find a Pet</a>
              <a href="#about">About</a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px' }}>
                Hi, {user.name.split(' ')[0]}!
              </span>
              <button
                type="button"
                className="detailsButton"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </nav>

          <header className="hero" id="home">
            <div className="heroText">
              <p className="eyebrow">🐾 FIND YOUR FOREVER FRIEND</p>
              <h1>
                Give a Pet a Home.
                <br />
                <span>Get Love Forever.</span>
              </h1>
              <p className="intro">
                Every pet deserves a loving family. Meet your new best
                friend and make a difference in a life today.
              </p>
              <a className="primaryButton" href="#pets">Meet Our Pets →</a>

              <div className="stats">
                <div><strong>{pets.length}</strong><small>Lovely Pets</small></div>
                <div><strong>100%</strong><small>Made with Love</small></div>
                <div><strong>1 Goal</strong><small>Happy Homes</small></div>
              </div>
            </div>

            <div className="heroArt">
              <div className="heroCircle">
                <img
                  src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=900&q=85"
                  alt="A happy dog ready for adoption"
                />
              </div>
              <div className="floating heart">♥</div>
              <div className="floating paw">🐾</div>
              <div className="heroNote">Your new best friend is waiting!</div>
            </div>
          </header>

          <section className="petsSection" id="pets">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">MEET YOUR MATCH</p>
                <h2>Pets Looking for Love</h2>
              </div>
              <p>Small paws, big hearts. Find the one<br />who belongs in your family.</p>
            </div>

            <div className="searchRow">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by pet name or breed..."
              />

              <div className="filters">
                {['All', 'Dog', 'Cat', 'Rabbit'].map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={filter === type ? 'filter active' : 'filter'}
                  >
                    {type === 'All' ? 'All Pets' : `${type}s`}
                  </button>
                ))}
              </div>
            </div>

            {loading && <p className="empty">Loading pets...</p>}
            {error && <p className="empty">{error}</p>}

            {!loading && !error && (
              <>
                <div className="petGrid">
                  {filteredPets.map(pet => (
                    <article className="petCard" key={pet._id}>
                      <div className="petImage">
                        <img
                          src={pet.image}
                          alt={pet.name}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                        />
                        <span className="available">
                          {pet.adopted ? 'Adopted' : 'Available'}
                        </span>
                      </div>

                      <div className="petInfo">
                        <div className="petTitle">
                          <h3>{pet.name}</h3>
                          <span>{pet.age}</span>
                        </div>
                        <p>{pet.breed || pet.type}</p>

                        <button
                          className="adoptButton"
                          disabled={pet.adopted}
                          onClick={() => {
                            setSelected(pet);
                            setFormPet(pet);
                            setMessage('');
                          }}
                        >
                          {pet.adopted ? 'Already Adopted' : `Meet ${pet.name} →`}
                        </button>

                        <button
                          className="detailsButton"
                          onClick={() => {
                            setSelected(pet);
                            setFormPet(null);
                          }}
                        >
                          View details
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {filteredPets.length === 0 && (
                  <p className="empty">No pets found. Try another search.</p>
                )}
              </>
            )}
          </section>

          <section className="aboutSection" id="about">
            <p className="eyebrow">WHY PAWPAL?</p>
            <h2>Adoption Changes Two Lives</h2>
            <p>We connect loving families with pets waiting for a safe, caring home.</p>

            <div className="aboutCards">
              <div><span>🏡</span><h3>Find a Family</h3><p>Help pets discover a loving forever home.</p></div>
              <div><span>❤️</span><h3>Adopt with Care</h3><p>Choose a companion that suits your lifestyle.</p></div>
              <div><span>🐾</span><h3>Make a Difference</h3><p>Give animals a new chance at happiness.</p></div>
            </div>
          </section>
        </>
      )}

      {/* ADMIN DASHBOARD */}
      {page === 'adminDashboard' && adminToken && (
        <section style={{ maxWidth: '1100px', margin: '45px auto', padding: '0 22px', minHeight: '60vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <p className="eyebrow">PAWPAL ADMIN</p>
              <h1>Adoption Requests</h1>
              <p>View applications and manage their status.</p>
            </div>
            <button className="detailsButton" onClick={handleAdminLogout}>Logout</button>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', margin: '25px 0' }}>
            {[
              ['Total Requests', adoptions.length],
              ['Pending', adoptions.filter(a => a.status === 'Pending').length],
              ['Approved', adoptions.filter(a => a.status === 'Approved').length],
              ['Rejected', adoptions.filter(a => a.status === 'Rejected').length]
            ].map(([label, value]) => (
              <div key={label} style={{ flex: '1 1 150px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#fff' }}>
                <p>{label}</p>
                <h2>{value}</h2>
              </div>
            ))}
          </div>

          <button className="primaryButton" onClick={() => loadAdoptions()} disabled={adoptionsLoading}>
            {adoptionsLoading ? 'Refreshing...' : 'Refresh Requests'}
          </button>

          {error && <p className="authError">{error}</p>}

          {adoptionsLoading ? (
            <p className="empty">Loading requests...</p>
          ) : adoptions.length === 0 ? (
            <p className="empty">No adoption requests found.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '25px' }}>
              {adoptions.map(adoption => (
                <article key={adoption._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '22px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                    <h3>🐾 {adoption.petName}</h3>
                    <span style={statusStyle(adoption.status)}>{adoption.status}</span>
                  </div>

                  <hr />
                  <p><strong>Applicant:</strong> {adoption.fullName}</p>
                  <p style={{ overflowWrap: 'anywhere' }}><strong>Email:</strong> {adoption.email}</p>
                  <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}><strong>Reason:</strong> {adoption.reason}</p>
                  <p style={{ color: '#777', fontSize: '13px' }}>
                    Submitted: {adoption.createdAt ? new Date(adoption.createdAt).toLocaleString() : 'Date unavailable'}
                  </p>

                  <label style={{ display: 'block', marginTop: '18px', fontWeight: '600' }}>
                    Update request status
                    <select
                      value={adoption.status}
                      disabled={updatingId === adoption._id}
                      onChange={e => updateStatus(adoption._id, e.target.value)}
                      style={{ display: 'block', width: '100%', padding: '11px', marginTop: '8px', borderRadius: '8px', border: '1px solid #ccc', background: '#fff' }}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </label>

                  {updatingId === adoption._id && <p>Updating status...</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* PET DETAILS MODAL */}
      {selected && !formPet && page === 'home' && (
        <div className="modalBackdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="closeButton" onClick={() => setSelected(null)}>×</button>

            {selected.image && (
              <img
                src={selected.image}
                alt={selected.name}
                style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '12px' }}
              />
            )}

            <h2>Meet {selected.name}</h2>
            <p><strong>Type:</strong> {selected.type}</p>
            <p><strong>Breed:</strong> {selected.breed || selected.type}</p>
            <p><strong>Age:</strong> {selected.age || 'Not specified'}</p>
            <p><strong>Location:</strong> {selected.location || 'Not specified'}</p>
            <p>{selected.description || `${selected.name} is looking for a caring family and a safe forever home.`}</p>

            {!selected.adopted && (
              <button className="primaryButton" onClick={() => {
                setFormPet(selected);
                setMessage('');
              }}>
                Apply to Adopt
              </button>
            )}
          </div>
        </div>
      )}

      {/* ADOPTION FORM */}
      {formPet && page === 'home' && (
        <div className="modalBackdrop" onClick={() => {
          if (!submitting) setFormPet(null);
        }}>
          <form
            className="modal adoptionForm"
            onSubmit={submitAdoption}
            onClick={e => e.stopPropagation()}
          >
            <button type="button" className="closeButton" disabled={submitting} onClick={() => setFormPet(null)}>×</button>
            <h2>Adopt {formPet.name}</h2>

            <label>
              Your full name
              <input name="fullName" defaultValue={user?.name || ''} required minLength={2} maxLength={100} />
            </label>

            <label>
              Email address
              <input name="email" type="email" defaultValue={user?.email || ''} required maxLength={254} />
            </label>

            <label>
              Why would you like to adopt?
              <textarea name="reason" required minLength={10} maxLength={1000} placeholder="Tell us about the home you can provide" rows="3" />
            </label>

            <button className="primaryButton" type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}

      <footer>
        🐾 PawPal — Every pet deserves a home.
        <span>Pet Adoption Platform Project</span>
      </footer>

      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;