import React from 'react';
import { Composition, registerRoot } from 'remotion';
import timeline from '../public/timeline.json';
import { Video } from './Video';

const Root: React.FC = () => (
  <Composition id="Main" component={Video} durationInFrames={(timeline as any).durationInFrames} fps={30} width={1920} height={1080} />
);

registerRoot(Root);
