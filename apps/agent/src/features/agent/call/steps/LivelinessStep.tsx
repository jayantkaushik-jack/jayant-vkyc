import { Check, X } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { StepFooter } from '@agent/components/call/StepFooter';
import type { LivenessAnswer, LivenessQuestionState } from '@agent/features/agent/call/CallFlowContext';
import { ThresholdChip } from '@agent/features/agent/call/steps/ThresholdChip';
import { cn } from '@vkyc/shared/lib/cn';

interface LivelinessStepProps {
  code: string;
  reviewMode?: boolean;
  reviewDirty?: boolean;
  stepPassed: boolean | null;
  questions: LivenessQuestionState[];
  remarks: string;
  onRemarksChange: (v: string) => void;
  onQuestionsChange: (questions: LivenessQuestionState[]) => void;
  onAskQuestion: (questionIndex: number) => void;
  onComplete: (passed: boolean, answers: LivenessAnswer[]) => void;
  readOnly?: boolean;
  requireAll?: boolean;
}

export function LivelinessStep({
  code: _code,
  reviewMode,
  reviewDirty,
  stepPassed,
  questions,
  remarks,
  onRemarksChange,
  onQuestionsChange,
  onAskQuestion,
  onComplete,
  readOnly,
  requireAll = true,
}: LivelinessStepProps) {
  void _code;
  const askQuestion = (idx: number) => {
    if (readOnly) return;
    const ts = new Date().toISOString();
    onQuestionsChange(
      questions.map((q, i) => (i === idx ? { ...q, asked: true, askedAt: ts } : q)),
    );
    onAskQuestion(idx);
  };

  const setResult = (idx: number, result: 'correct' | 'wrong') => {
    if (readOnly || !questions[idx].asked) return;
    onQuestionsChange(
      questions.map((q, i) => (i === idx ? { ...q, result } : q)),
    );
  };

  const allAnswered = questions.every((q) => q.result !== null);
  const allCorrect = questions.every((q) => q.result === 'correct');
  const gatePassed = !requireAll || allCorrect;

  const buildAnswers = (): LivenessAnswer[] =>
    questions.map((q) => ({
      question: q.question,
      answer: q.answer,
      result: q.result === 'correct' ? 'Correct' : 'Wrong',
      askedAt: q.askedAt,
    }));

  return (
    <div className="space-y-4">
      {reviewMode && stepPassed !== null && (
        <StepResultChip passed={stepPassed} />
      )}

      <ThresholdChip
        label="Liveness vs threshold"
        passedOverride={allAnswered ? gatePassed : undefined}
      />

      {questions.map((q, i) => (
        <Card key={`${q.question}-${i}`}>
          <p className="text-sm font-medium mb-3">{q.question}</p>
          {!q.asked && !readOnly && (
            <Button variant="secondary" size="sm" onClick={() => askQuestion(i)}>
              Ask Question
            </Button>
          )}
          {!q.asked && readOnly && (
            <p className="text-xs text-text-muted">Not asked</p>
          )}
          {q.asked && (
            <>
              <span className="inline-block px-3 py-1 bg-primary-soft text-primary rounded-full text-sm mb-3">
                {q.answer}
              </span>
              {!readOnly && (
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    size="sm"
                    variant={q.result === 'correct' ? 'success' : 'secondary'}
                    onClick={() => setResult(i, 'correct')}
                  >
                    <Check size={14} /> Correct
                  </Button>
                  <Button
                    size="sm"
                    variant={q.result === 'wrong' ? 'destructive' : 'secondary'}
                    onClick={() => setResult(i, 'wrong')}
                  >
                    <X size={14} /> Wrong
                  </Button>
                </div>
              )}
              {readOnly && q.result && (
                <p className={cn('text-sm font-medium', q.result === 'correct' ? 'text-success' : 'text-danger')}>
                  {q.result === 'correct' ? 'Correct' : 'Wrong'}
                </p>
              )}
            </>
          )}
        </Card>
      ))}

      <StepFooter
        remarks={remarks}
        onRemarksChange={onRemarksChange}
        onNext={() => onComplete(allCorrect, buildAnswers())}
        nextLabel={allCorrect ? 'Next' : 'Next — Issues Found'}
        nextDisabled={!allAnswered}
        reviewMode={reviewMode}
        reviewDirty={reviewDirty}
      />
    </div>
  );
}

export function StepResultChip({ passed }: { passed: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex px-3 py-1 rounded-full text-xs font-semibold',
        passed ? 'bg-success-subtle text-success-strong border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger',
      )}
    >
      {passed ? 'Verified ✓' : 'Failed ✗'}
    </span>
  );
}
