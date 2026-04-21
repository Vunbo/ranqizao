import React from 'react';
import { Droplets, Thermometer } from 'lucide-react';
import { Device } from '../../../shared/types';
import { Card } from '../../../shared/ui/Card';

export const DeviceStatsGrid = ({ device }: { device: Device }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-2">
    <Card className="flex flex-col items-center justify-center space-y-2 py-6">
      <div className="rounded-lg bg-orange-50 p-2 text-orange-500">
        <Thermometer size={24} />
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500">锅底温度</p>
        <p className="text-xl font-bold">{device.temp.toFixed(1)}°C</p>
      </div>
    </Card>
    <Card className="flex flex-col items-center justify-center space-y-2 py-6">
      <div className="rounded-lg bg-blue-50 p-2 text-blue-500">
        <Droplets size={24} />
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500">燃气浓度</p>
        <p className="text-xl font-bold">{device.gas.toFixed(2)}% LEL</p>
      </div>
    </Card>
  </div>
);
