import { Navigate, Route, Routes } from 'react-router-dom';
import { DEMO_TOKEN } from '@customer/features/customer/journeyConfig';
import { JourneyPage } from '@customer/features/customer/pages/JourneyPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/journey/${DEMO_TOKEN}`} replace />} />
      <Route path="/journey/:token" element={<JourneyPage />} />
      <Route path="*" element={<Navigate to={`/journey/${DEMO_TOKEN}`} replace />} />
    </Routes>
  );
}
