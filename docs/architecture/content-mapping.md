'use client';

import React, { useEffect } from 'react';
import mermaid from 'mermaid';

const ContentMappingFlowchart = () => {
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      flowchart: { curve: 'basis' },
      securityLevel: 'loose',
    });
    
    try {
      mermaid.run();
    } catch (error) {
      console.error('Mermaid initialization error:', error);
    }
  }, []);

  return (
    <div className="rounded-lg bg-gray-50 p-4 shadow-sm my-8 overflow-x-auto">
      <h3 className="text-lg font-medium mb-4">Content Mapping System Architecture</h3>
      <pre className="mermaid">
        {`
        flowchart TD
            Creator[Creator]
            CM[Content Mapping System]
            Platform[Platform APIs]
            AI[AI Analysis System]
            AE[Analytics Engine]
            UI[User Interface]
            DB[(Graph Database)]
            
            Creator -->|Adds Content| CM
            Platform -->|Content Data| CM
            AI -->|Relationship Detection| CM
            CM -->|Content Family Data| AE
            CM -->|Visualization Data| UI
            CM --> DB
            AE -->|Performance Metrics| UI
            
            subgraph Content Mapping Core
            CM
            DB
            end
        `}
      </pre>
    </div>
  );
};

export default ContentMappingFlowchart;