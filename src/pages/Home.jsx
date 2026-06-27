import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="home">
      <h1>BB 34th Singapore Company</h1>
      <p>Target Test — Choose your role to get started</p>
      <div className="home-cards">
        <Link to="/student" className="home-card">
          <span className="icon">📚</span>
          <h2>Student</h2>
          <p>Study the material, chat with AI tutor, then take the test</p>
        </Link>
        <Link to="/teacher" className="home-card">
          <span className="icon">🎓</span>
          <h2>Teacher</h2>
          <p>View all student submissions and results</p>
        </Link>
      </div>
    </div>
  );
}
