import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Student from './pages/Student';
import Teacher from './pages/Teacher';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student" element={<Student />} />
        <Route path="/teacher" element={<Teacher />} />
      </Routes>
    </BrowserRouter>
  );
}
