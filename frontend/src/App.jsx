import RiskMap from './pages/RiskMap';

function App() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg1NDdhMjBjLWEyODQtNGU5Yi1hMGRhLWUxYzUzYTAwOTZkZSIsInVzZXJuYW1lIjoia3JpdGkiLCJuYW1lIjoiS3JpdGkiLCJpYXQiOjE3ODI2Mzg3ODksImV4cCI6MTc4NTIzMDc4OX0.ezm8EAlLZ1stOTZObXrkJKZa061u_I7NRKmGi7-Xhik";
  return <RiskMap token={token} />;
}

export default App;