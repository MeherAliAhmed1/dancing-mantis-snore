import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MeetingSummaryPanelProps {
  summary?: string;
}

const MeetingSummaryPanel: React.FC<MeetingSummaryPanelProps> = ({ summary }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_SUMMARY_LENGTH = 200; // Max characters to show before truncating

  if (!summary || summary.trim() === '') {
    return (
      <div className="mt-3 text-sm text-muted-foreground italic px-3 py-2">
        No summary available for this meeting.
      </div>
    );
  }

  const isTruncated = summary.length > MAX_SUMMARY_LENGTH && !isExpanded;
  const displayedSummary = isTruncated ? summary.substring(0, MAX_SUMMARY_LENGTH) + '...' : summary;

  return (
    <div className="mt-3 px-3 py-2">
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {displayedSummary}
      </p>
      {summary.length > MAX_SUMMARY_LENGTH && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-0 mt-2 text-blue-600 dark:text-blue-400 hover:no-underline text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" /> Show Less
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" /> View Summary
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default MeetingSummaryPanel;