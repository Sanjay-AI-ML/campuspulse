/* CampusPulse — hand-rolled stroke SVG icon set.
   All icons are functional components returning an <svg> element. */

const { createElement: h } = React;

const Icon = {
  Logo: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
    h('polyline', { points:'9 22 9 12 15 12 15 22' })),

  Dashboard: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('rect', { x:'3', y:'3', width:'7', height:'7' }),
    h('rect', { x:'14', y:'3', width:'7', height:'7' }),
    h('rect', { x:'14', y:'14', width:'7', height:'7' }),
    h('rect', { x:'3', y:'14', width:'7', height:'7' })),

  Alert: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' }),
    h('line', { x1:'12', y1:'9', x2:'12', y2:'13' }),
    h('line', { x1:'12', y1:'17', x2:'12.01', y2:'17' })),

  Check: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('polyline', { points:'20 6 9 17 4 12' })),

  Clock: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('circle', { cx:'12', cy:'12', r:'10' }),
    h('polyline', { points:'12 6 12 12 16 14' })),

  Inbox: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('polyline', { points:'22 12 16 12 14 15 10 15 8 12 2 12' }),
    h('path', { d:'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' })),

  Plus: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('line', { x1:'12', y1:'5', x2:'12', y2:'19' }),
    h('line', { x1:'5', y1:'12', x2:'19', y2:'12' })),

  User: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' }),
    h('circle', { cx:'12', cy:'7', r:'4' })),

  Lock: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('rect', { x:'3', y:'11', width:'18', height:'11', rx:'2', ry:'2' }),
    h('path', { d:'M7 11V7a5 5 0 0 1 10 0v4' })),

  Logout: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }),
    h('polyline', { points:'16 17 21 12 16 7' }),
    h('line', { x1:'21', y1:'12', x2:'9', y2:'12' })),

  Pin: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' }),
    h('circle', { cx:'12', cy:'10', r:'3' })),

  Search: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('circle', { cx:'11', cy:'11', r:'8' }),
    h('line', { x1:'21', y1:'21', x2:'16.65', y2:'16.65' })),

  Filter: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('polygon', { points:'22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3' })),

  Sparkle: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z' })),

  // --- new PS-4 icons ---

  // ArrowUp — upvote button
  ArrowUp: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2.5, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M12 19V5' }),
    h('path', { d:'M5 12l7-7 7 7' })),

  // BarChart — analytics tab
  BarChart: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('rect', { x:'3', y:'12', width:'4', height:'9', rx:'1' }),
    h('rect', { x:'10', y:'7', width:'4', height:'14', rx:'1' }),
    h('rect', { x:'17', y:'3', width:'4', height:'18', rx:'1' })),

  // Image — photo upload
  Image: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('rect', { x:'3', y:'3', width:'18', height:'18', rx:'2', ry:'2' }),
    h('circle', { cx:'8.5', cy:'8.5', r:'1.5' }),
    h('polyline', { points:'21 15 16 10 5 21' })),

  // Robot — AI assistant
  Robot: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('rect', { x:'3', y:'8', width:'18', height:'13', rx:'2' }),
    h('path', { d:'M8 8V5a4 4 0 0 1 8 0v3' }),
    h('circle', { cx:'9', cy:'14', r:'1.5' }),
    h('circle', { cx:'15', cy:'14', r:'1.5' }),
    h('path', { d:'M9 18h6' })),

  // Send — for AI assistant submit
  Send: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('line', { x1:'22', y1:'2', x2:'11', y2:'13' }),
    h('polygon', { points:'22 2 15 22 11 13 2 9 22 2' })),

  // Zap — AI priority indicator
  Zap: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('polygon', { points:'13 2 3 14 12 14 11 22 21 10 12 10 13 2' })),

  // Camera — photo attach button
  Camera: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }),
    h('circle', { cx:'12', cy:'13', r:'4' })),

  // X — close/remove
  X: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('line', { x1:'18', y1:'6', x2:'6', y2:'18' }),
    h('line', { x1:'6', y1:'6', x2:'18', y2:'18' })),

  // ChevronDown
  ChevronDown: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'m6 9 6 6 6-6' })),

  // Wrench — maintenance/action
  Wrench: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('path', { d:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' })),

  // TrendingUp — stats
  TrendingUp: (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
    h('polyline', { points:'23 6 13.5 15.5 8.5 10.5 1 18' }),
    h('polyline', { points:'17 6 23 6 23 12' })),

  // Category icons
  CategoryIcon(category, props = {}) {
    const map = {
      'Electrical / Fan': Icon.Zap,
      'Projector / AV': (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
        h('rect', { x:'2', y:'7', width:'20', height:'15', rx:'2' }),
        h('polyline', { points:'17 2 12 7 7 2' })),
      'Wi-Fi / Network': (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
        h('path', { d:'M5 12.55a11 11 0 0 1 14.08 0' }),
        h('path', { d:'M1.42 9a16 16 0 0 1 21.16 0' }),
        h('path', { d:'M8.53 16.11a6 6 0 0 1 6.95 0' }),
        h('line', { x1:'12', y1:'20', x2:'12.01', y2:'20' })),
      'Plumbing': (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
        h('path', { d:'M3 3h6v6H3z' }),
        h('path', { d:'M15 3h6v6h-6z' }),
        h('path', { d:'M6 9v6' }),
        h('path', { d:'M18 9v6' }),
        h('path', { d:'M6 15h12' }),
        h('path', { d:'M12 15v6' })),
      'Furniture': (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
        h('path', { d:'M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3' }),
        h('path', { d:'M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0z' }),
        h('line', { x1:'6', y1:'19', x2:'6', y2:'21' }),
        h('line', { x1:'18', y1:'19', x2:'18', y2:'21' })),
      'Cleanliness': (p) => h('svg', { xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:2, strokeLinecap:'round', strokeLinejoin:'round', ...p },
        h('polyline', { points:'3 6 5 6 21 6' }),
        h('path', { d:'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' })),
      'Safety / Security': Icon.Alert,
      'Other': Icon.Inbox,
    };
    const Comp = map[category] || Icon.Inbox;
    return h(Comp, props);
  },
};

window.Icon = Icon;
