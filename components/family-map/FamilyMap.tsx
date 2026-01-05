"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { FamilyNodeData } from '@/lib/types';
import { Node } from '@xyflow/react';

// Fix Leaflet's default icon path issues in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface FamilyMapProps {
    nodes: Node<FamilyNodeData>[];
}

interface PersonLocation {
    id: string;
    name: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude: number;
    longitude: number;
    relation: 'Primary' | 'Spouse';
}

function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

export default function FamilyMap({ nodes }: FamilyMapProps) {
    const [people, setPeople] = useState<PersonLocation[]>([]);

    useEffect(() => {
        const locations: PersonLocation[] = [];
        nodes.forEach(node => {
            const data = node.data;

            // Primary
            const p = data.primary;
            if (p && p.name && (p.alive !== false) && p.latitude && p.longitude) {
                 locations.push({
                     id: node.id + '-primary',
                     name: p.name,
                     city: p.city,
                     state: p.state,
                     pincode: p.pincode,
                     latitude: Number(p.latitude),
                     longitude: Number(p.longitude),
                     relation: 'Primary'
                 });
            }

            // Spouse
            const s = data.spouse;
            if (s && s.name && (s.alive !== false) && s.latitude && s.longitude) {
                locations.push({
                    id: node.id + '-spouse',
                    name: s.name || "Spouse",
                    city: s.city,
                    state: s.state,
                    pincode: s.pincode,
                    latitude: Number(s.latitude),
                    longitude: Number(s.longitude),
                    relation: 'Spouse'
                });
            }
        });
        setPeople(locations);
    }, [nodes]);

    return (
        <div className="h-full w-full relative z-0">
             <MapContainer 
                center={[20.5937, 78.9629]} // Center of India
                zoom={5} 
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {people.map(person => (
                    <CircleMarker 
                        key={person.id} 
                        center={[person.latitude, person.longitude]}
                        radius={6}
                        pathOptions={{ 
                            fillColor: '#2563eb', // Primary Blue
                            fillOpacity: 0.8, 
                            color: 'white', 
                            weight: 1 
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <strong className="block text-base">{person.name}</strong>
                                <span className="text-xs text-muted-foreground bg-primary/10 px-1 rounded">{person.relation}</span>
                                <div className="mt-2 space-y-1">
                                    {person.city && <div>📍 {person.city}, {person.state}</div>}
                                    {person.pincode && <div>📮 {person.pincode}</div>}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            {/* Overlay Statistics */}
            <div className="absolute bottom-5 left-5 z-[1000] bg-white/90 p-3 rounded-lg shadow-md backdrop-blur-sm border">
                <h4 className="font-semibold text-sm">Family in India</h4>
                <div className="text-2xl font-bold text-primary">{people.length}</div>
                <div className="text-xs text-muted-foreground">Mapped Locations</div>
            </div>
        </div>
    );
}
