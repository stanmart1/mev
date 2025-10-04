import { Database, Wifi } from 'lucide-react';
import { useDemo } from '../../contexts/DemoContext';
import Button from './Button';

export default function DemoToggle() {
  const { demoMode, setDemoMode } = useDemo();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={demoMode ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setDemoMode(true)}
        className="flex items-center gap-2"
      >
        <Database className="w-4 h-4" />
        Demo
      </Button>
      <Button
        variant={!demoMode ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => setDemoMode(false)}
        className="flex items-center gap-2"
      >
        <Wifi className="w-4 h-4" />
        Real Data
      </Button>
    </div>
  );
}