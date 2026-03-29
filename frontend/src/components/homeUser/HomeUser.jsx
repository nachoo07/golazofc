import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom';
import { FaCalendarCheck, FaEllipsisH } from 'react-icons/fa';
import "./homeUser.css"
import AppNavbar from '../navbar/AppNavbar';
import logo from '../../assets/logo.png';
import DesktopNavbar from '../navbar/DesktopNavbar';
import Sidebar from '../sidebar/Sidebar';

const HomeUser = () => {

  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth > 576);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const menuItems = [
    { name: 'Asistencia', route: '/attendance', icon: <FaCalendarCheck /> },
  ];

  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowWidth(newWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const filteredMenuItems = menuItems;

  return (
    <div className={`app-container ${window.innerWidth <= 576 ? 'mobile-view' : ''}`}>
      {windowWidth <= 576 && (
        <AppNavbar isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} />
      )}
      {windowWidth > 576 && (
        <DesktopNavbar
          logoSrc={logo}
        />
      )}
      <div className="dashboard-layout">
        <Sidebar
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          activeRoute="/homeuser"
        />
        <main className="main-content">
          <div className="content-columns">
            <div className="main-column">
              <section className="dashboard-modules">
                <div className="modules-container">
                  <h2 className="section-title">Módulos del Sistema</h2>
                  <div className="modules-grid">
                    {filteredMenuItems.map((item, index) => (
                      <div
                        key={index}
                        className="module-card"
                        onClick={() => navigate(item.route)}
                      >
                        <div className="module-icon-container">
                          {item.icon}
                        </div>
                        <h3 className="module-title">{item.name}</h3>
                        <span className="module-category-tag">{item.category}</span>
                        <button className="module-menu-btn">
                          <FaEllipsisH />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div >
  );
};

export default HomeUser
