import { useState } from 'react';
import { Download, FileText, Table, BarChart3 } from 'lucide-react';
import Button from '../common/Button';

export default function ExportTools({ data, filename = 'mev-data', onExport }) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');

  const exportFormats = [
    { value: 'csv', label: 'CSV', icon: Table },
    { value: 'json', label: 'JSON', icon: FileText },
    { value: 'pdf', label: 'PDF Report', icon: BarChart3 }
  ];

  const handleExport = async (format) => {
    setIsExporting(true);
    try {
      if (onExport) {
        await onExport(data, format, filename);
      } else {
        // Default export implementation
        await exportData(data, format, filename);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const exportData = async (data, format, filename) => {
    let content, mimeType, extension;

    switch (format) {
      case 'csv':
        content = convertToCSV(data);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'pdf':
        // For PDF, you would typically use a library like jsPDF
        console.log('PDF export not implemented');
        return;
      default:
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  return (
    <div className="flex items-center space-x-2">
      <select
        value={exportFormat}
        onChange={(e) => setExportFormat(e.target.value)}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
      >
        {exportFormats.map(format => (
          <option key={format.value} value={format.value}>
            {format.label}
          </option>
        ))}
      </select>
      
      <Button
        onClick={() => handleExport(exportFormat)}
        disabled={isExporting || !data || data.length === 0}
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>
    </div>
  );
}

export function QuickExportButtons({ data, filename = 'mev-data', onExport }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickExport = async (format) => {
    setIsExporting(true);
    try {
      if (onExport) {
        await onExport(data, format, filename);
      } else {
        // Default implementation would go here
        console.log(`Exporting as ${format}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={() => handleQuickExport('csv')}
        disabled={isExporting}
        size="sm"
        variant="outline"
      >
        <Table className="w-4 h-4 mr-1" />
        CSV
      </Button>
      
      <Button
        onClick={() => handleQuickExport('json')}
        disabled={isExporting}
        size="sm"
        variant="outline"
      >
        <FileText className="w-4 h-4 mr-1" />
        JSON
      </Button>
      
      <Button
        onClick={() => handleQuickExport('pdf')}
        disabled={isExporting}
        size="sm"
        variant="outline"
      >
        <BarChart3 className="w-4 h-4 mr-1" />
        PDF
      </Button>
    </div>
  );
}