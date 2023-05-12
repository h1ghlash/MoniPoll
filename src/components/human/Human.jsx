import React, { useEffect, useState } from 'react';
import './human.css';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import iconMan from "./resources/man.svg"
import * as turf from '@turf/turf';

const Human = ({ pedestrianPaths, isSimulationRunning, numPeople, simulationUpdate, simulationTime}) => {
    const [people, setPeople] = useState([]);
    const handlePathUpdate = (person) => {
        const path = pedestrianPaths.features[Math.floor(Math.random() * pedestrianPaths.features.length)];
        const startPosition = path.geometry.coordinates[0];
        const destination = path.geometry.coordinates[path.geometry.coordinates.length - 1];
        const distance = turf.distance(
            [startPosition[1], startPosition[0]],
            [destination[1], destination[0]]
        );
        const duration = Math.floor(Math.random() * 30000) + 10000;
        const speed = 0.002;
        return {
            ...person,
            currentPosition: {
                lat: startPosition[1],
                lng: startPosition[0],
            },
            destination: {
                lat: destination[1],
                lng: destination[0],
            },
            duration,
            speed,
        };
    };

    const initializePeople = (count, simulationTime) => {
        const hour = new Date(simulationTime).getHours();
        let newPeopleCount = count;
        if ((hour >= 7 && hour <= 11) || (hour >= 16 && hour <= 20)) {
            newPeopleCount = count;
        } else if (hour >= 0 && hour <= 6) {
            newPeopleCount = 90;
        } else {
            newPeopleCount = Math.floor(Math.random() * (count - 90 + 1)) + 90;
        }
        const newPeople = [];
        people.forEach((person) => {
            if (newPeople.length < newPeopleCount) {
                newPeople.push(person);
            }
        });
        if (newPeople.length < newPeopleCount) {
            const remaining = newPeopleCount - newPeople.length;
            const additionalPeople = Array.from({ length: remaining }, (_, index) => {
                return handlePathUpdate({
                    key: `person-${people.length + index}`,
                });
            });
            newPeople.push(...additionalPeople);
        }
        setPeople(newPeople);
    };


    useEffect(() => {
        if (pedestrianPaths && pedestrianPaths.features.length > 0) {
            initializePeople(numPeople, simulationTime);
        }
    }, [numPeople, simulationTime]);

    useEffect(() => {
        if (pedestrianPaths && pedestrianPaths.features.length > 0) {
            const timer = setInterval(() => {
                setPeople((prevPeople) => {
                    const newPeople = [];
                    prevPeople.forEach((person) => {
                        if (
                            person.currentPosition &&
                            person.destination &&
                            person.currentPosition.lat !== undefined &&
                            person.currentPosition.lng !== undefined &&
                            person.destination.lat !== undefined &&
                            person.destination.lng !== undefined
                        ) {
                            const currentPoint = turf.point([
                                person.currentPosition.lng,
                                person.currentPosition.lat,
                            ]);
                            const destPoint = turf.point([
                                person.destination.lng,
                                person.destination.lat,
                            ]);
                            const distance = turf.distance(currentPoint, destPoint);
                            if (distance > person.speed) {
                                const bearing = turf.bearing(currentPoint, destPoint);
                                const newPoint = turf.destination(
                                    currentPoint,
                                    person.speed,
                                    bearing
                                );
                                newPeople.push({
                                    ...person,
                                    currentPosition: {
                                        lat: turf.getCoord(newPoint)[1],
                                        lng: turf.getCoord(newPoint)[0],
                                    },
                                });
                            } else {
                                newPeople.push(handlePathUpdate(person));
                            }
                        } else {
                            newPeople.push(handlePathUpdate(person));
                        }
                    });
                    return newPeople;
                });
            }, 100);
            return () => clearInterval(timer);
        }
    }, [pedestrianPaths, simulationUpdate]);

    return (
        <>
            {isSimulationRunning && people.length > 0 &&
                people.map((person) => {
                    if(person.currentPosition &&
                        person.currentPosition.lat !== undefined &&
                        person.currentPosition.lng !== undefined)
                    {
                        return (<Marker
                            key={person.key}
                            position={person.currentPosition}
                            icon={L.icon({
                                iconUrl:
                                iconMan,
                                iconSize: [32, 32],
                            })}
                        >
                            <Popup>
                                {person.key}
                                {person.currentPosition.lng}
                                {person.currentPosition.lat}
                            </Popup>
                        </Marker>)
                    }
                })}
        </>
    );

};

export default Human;
