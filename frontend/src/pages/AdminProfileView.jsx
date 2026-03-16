import { useParams } from 'react-router-dom';
import Profile from './Profile';

export default function AdminProfileView() {
  const { ehr_no } = useParams();
  return <Profile ehrOverride={ehr_no} />;
}

