import MEVDemoShowcase from '../../components/demo/MEVDemoShowcase';

export default function DemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          MEV Analytics Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive demonstration of all platform features with live data simulation
        </p>
      </div>
      
      <MEVDemoShowcase />
    </div>
  );
}