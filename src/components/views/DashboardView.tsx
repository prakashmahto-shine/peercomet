import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CareerGuidanceView } from './CareerGuidanceView';

export const DashboardView: React.FC = () => {
  const { navigate, experts, selectExpertById } = useApp();

  useEffect(() => {
    navigate('guidance-view', '/peercomet');
  }, []);

  return (
    <CareerGuidanceView
      onNavigate={navigate}
      onSelectExpert={(id) => {
        selectExpertById(id);
        navigate('expert-profile-view', `/expert/${id}`);
      }}
      experts={experts}
    />
  );
};
