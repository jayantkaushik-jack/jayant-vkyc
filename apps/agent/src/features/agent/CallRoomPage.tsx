import { useNavigate } from 'react-router-dom';
import { PostCallConfirmation } from '@agent/components/call/PostCallConfirmation';
import { VideoPanel } from '@agent/features/agent/call/VideoPanel';
import { StepWorkspace } from '@agent/features/agent/call/StepWorkspace';
import { ProgressRail } from '@agent/features/agent/call/ProgressRail';
import { CallFlowProvider, useCallFlow } from '@agent/features/agent/call/CallFlowContext';
import { useAgent } from '@agent/features/agent/AgentContext';

function CallRoomContent() {
  const navigate = useNavigate();
  const { clearCall, cameraStream, cameraStatus } = useAgent();
  const flow = useCallFlow();

  const captureMode = flow.getCaptureMode();

  const handleNextCall = () => {
    clearCall();
    navigate('/agent/queue');
  };

  const handleGoHome = () => {
    clearCall();
    navigate('/agent');
  };

  if (flow.showConfirmation && flow.decision) {
    return (
      <PostCallConfirmation
        decision={flow.decision}
        session={flow.session}
        callDurationSec={flow.finalDurationSec ?? 0}
        rejectionReasons={flow.rejectionReasons}
        verdict={flow.amberVerdict}
        path={flow.amberPath}
        onNextCall={handleNextCall}
        onGoHome={handleGoHome}
      />
    );
  }

  return (
    <div className="p-4 h-[calc(100vh-3.5rem)]">
      {flow.started && !flow.sessionEnded && (
        <div className="flex justify-end gap-4 mb-2 max-w-[1800px] mx-auto text-xs text-text-muted">
          <button
            type="button"
            onClick={() => flow.endCallIncomplete()}
            className="underline hover:no-underline hover:text-text"
          >
            End Session
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 h-full max-w-[1800px] mx-auto min-h-0">
        {flow.started && (
          <ProgressRail
            stepStatuses={flow.stepStatuses}
            currentStage={flow.currentStage}
          />
        )}

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="w-[38%] shrink-0">
            <VideoPanel
              session={flow.session}
              livenessCode={flow.shouldShowLivenessCodeOverlay ? flow.livenessCode : undefined}
              captureMode={captureMode}
              cameraStream={cameraStream}
              cameraStatus={cameraStatus}
              captureNonce={flow.captureNonce}
              onCapture={flow.submitVideoCapture}
              onEndCall={() => flow.endCallIncomplete()}
            />
          </div>

          <div className="flex-1 bg-surface rounded-xl border border-border shadow-card overflow-hidden flex flex-col min-w-0">
            <StepWorkspace />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CallRoomPage() {
  const navigate = useNavigate();
  const { callSession, demoPersonaId } = useAgent();

  if (!callSession) {
    navigate('/agent/queue');
    return null;
  }

  return (
    <CallFlowProvider session={callSession} amberPersonaId={demoPersonaId}>
      <CallRoomContent />
    </CallFlowProvider>
  );
}
