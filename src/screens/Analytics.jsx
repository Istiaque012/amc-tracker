import Card from '../components/Common/Card';
import ForgettingCurves from '../components/Charts/ForgettingCurves';
import SRTimeline from '../components/Charts/SRTimeline';
import EMediciAreaChart from '../components/Charts/EMediciAreaChart';
import RetentionMap from '../components/Charts/RetentionMap';
import StudyHeatmap from '../components/Charts/StudyHeatmap';
import SRDonut from '../components/Charts/SRDonut';

export default function Analytics({ logs, srRecords }) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#0F172A] mb-1">Analytics</h1>
        <p className="font-sans text-[#64748B] text-sm">Visual progress tracking across all dimensions</p>
      </div>

      <div className="flex flex-col gap-8">
        {/* 1. Forgetting Curves */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Ebbinghaus Forgetting Curves</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Retention decay per subject with SR review sawtooth jumps</p>
          <ForgettingCurves srRecords={srRecords} logs={logs} />
        </Card>

        {/* 2. SR Timeline */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">SR Review Timeline</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Gantt view of all scheduled spaced repetition events</p>
          <div className="overflow-x-auto">
            <SRTimeline srRecords={srRecords} />
          </div>
        </Card>

        {/* 3. eMedici Area Chart */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">eMedici Progress</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Cumulative questions done vs target</p>
          <EMediciAreaChart logs={logs} />
        </Card>

        {/* 4. Retention Heatmap */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Subject Retention Map</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">Current estimated retention per subject</p>
          <RetentionMap srRecords={srRecords} logs={logs} />
        </Card>

        {/* 5. Study Activity Heatmap */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">Study Activity Heatmap</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-4">GitHub-style calendar from May 4 to exam day</p>
          <StudyHeatmap logs={logs} />
        </Card>

        {/* 6. SR Donut */}
        <Card className="p-6">
          <h2 className="font-serif text-xl text-[#0F172A] mb-1">SR Compliance</h2>
          <p className="font-sans text-xs text-[#94A3B8] mb-2">Done vs pending vs overdue reviews</p>
          <div style={{ maxWidth: 400 }}>
            <SRDonut srRecords={srRecords} />
          </div>
        </Card>
      </div>
    </div>
  );
}
