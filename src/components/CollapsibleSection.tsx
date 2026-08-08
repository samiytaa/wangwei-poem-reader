import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

export default function CollapsibleSection({ title, children, defaultCollapsed = true }: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`section ${collapsed ? 'collapsed' : ''}`}>
      <h3 onClick={() => setCollapsed(!collapsed)}>
        <span className="arrow">▾</span>
        {title}
      </h3>
      <div className="content">
        {children}
      </div>
    </div>
  );
}
