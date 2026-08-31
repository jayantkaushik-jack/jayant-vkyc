import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CustomerJourneyProvider, useCustomerJourney } from '@customer/features/customer/CustomerJourneyContext';
import { JourneyShell } from '@customer/components/JourneyShell';
import { useCamera } from '@customer/hooks/useCamera';
import {
  CompletionScreen,
  ConsentScreen,
  DeclineExitScreen,
  FailureBlacklistedScreen,
  FailureEkycExpiredScreen,
  FailureLinkExpiredScreen,
  FailureOutsideIndiaScreen,
  FailureVpnScreen,
  FeedbackScreen,
  InCallScreen,
  LandingScreen,
  LocationDeniedScreen,
  LocationRejectedScreen,
  PartnerReturnScreen,
  ServiceClosedScreen,
  PermissionsDeniedScreen,
  PermissionsScreen,
  PrechecksScreen,
  ReattemptScreen,
  WaitingScreen,
} from '@customer/features/customer/screens/JourneyScreens';

function JourneyRouter() {
  const {
    phase,
    cameraSimulated,
    setCameraSimulated,
    setPermissionsGranted,
    permissionsGranted,
  } = useCustomerJourney();
  const { stream, simulated, request, setSimulated } = useCamera();

  useEffect(() => {
    if (simulated !== cameraSimulated) {
      setCameraSimulated(simulated);
    }
  }, [simulated, cameraSimulated, setCameraSimulated]);

  useEffect(() => {
    if (stream && !permissionsGranted) {
      setPermissionsGranted(true);
    }
  }, [stream, permissionsGranted, setPermissionsGranted]);

  switch (phase) {
    case 'landing':
      return <LandingScreen />;
    case 'location_denied':
      return <LocationDeniedScreen />;
    case 'location_rejected':
      return <LocationRejectedScreen />;
    case 'service_closed':
      return <ServiceClosedScreen />;
    case 'consent':
      return <ConsentScreen />;
    case 'decline_exit':
      return <DeclineExitScreen />;
    case 'permissions':
      return (
        <PermissionsScreen
          onRequest={request}
          stream={stream}
          simulated={simulated}
        />
      );
    case 'permissions_denied':
      return (
        <PermissionsDeniedScreen
          onRetry={request}
          onSimulated={() => {
            setSimulated(true);
            setCameraSimulated(true);
            setPermissionsGranted(true);
          }}
        />
      );
    case 'prechecks':
      return <PrechecksScreen stream={stream} />;
    case 'failure_vpn':
      return <FailureVpnScreen />;
    case 'failure_outside_india':
      return <FailureOutsideIndiaScreen />;
    case 'failure_ekyc_expired':
      return <FailureEkycExpiredScreen />;
    case 'failure_link_expired':
      return <FailureLinkExpiredScreen />;
    case 'failure_blacklisted':
      return <FailureBlacklistedScreen />;
    case 'waiting':
      return <WaitingScreen />;
    case 'incall':
    case 'reconnecting':
    case 'stepped_away':
      return <InCallScreen stream={stream} simulated={simulated} />;
    case 'feedback':
      return <FeedbackScreen />;
    case 'completion':
      return <CompletionScreen />;
    case 'partner_return':
      return <PartnerReturnScreen />;
    case 'reattempt':
      return <ReattemptScreen />;
    default:
      return <LandingScreen />;
  }
}

export function JourneyPage() {
  const { token = 'demo-pbz-7f3a' } = useParams<{ token: string }>();
  const [search] = useSearchParams();
  const demoDefaultOpen = search.get('demo') === '1';

  return (
    <CustomerJourneyProvider token={token} demoDefaultOpen={demoDefaultOpen}>
      <JourneyShell>
        <JourneyRouter />
      </JourneyShell>
    </CustomerJourneyProvider>
  );
}
