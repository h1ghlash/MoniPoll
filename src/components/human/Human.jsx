import React, { useEffect, useState } from 'react';
import cl from "./human.module.css"
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import iconMan from "./resources/man.svg"
import IconInfectedMan from "./resources/infectedman.svg"
import * as turf from '@turf/turf';
//import {CircleMarker} from "react-leaflet/CircleMarker";
import {Circle} from "react-leaflet/Circle"

const Human = ({people, setPeople, pedestrianPaths, isSimulationRunning, numPeople, simulationUpdate, simulationTime, zone, setInfectedCount, setUninfectedCount}) => {
    const checkPersonInfection = (currentCoordinates, currentInfectionDegree, otherCoordinates, otherInfectionDegree) => {
        const currentPoint = turf.point([currentCoordinates.lng, currentCoordinates.lat]);
        const otherPoint = turf.point([otherCoordinates.lng, otherCoordinates.lat]);
        const option = "kilometers";
        const distance = turf.distance(currentPoint, otherPoint, option);
        const distanceInMeters = Math.round(distance * 1000);
        if (distanceInMeters <= 30) {
            const updatedInfectionDegree = otherInfectionDegree / 4; // Degree of infection is four times less
            return Math.max(currentInfectionDegree, updatedInfectionDegree);
        }

        return currentInfectionDegree;
    };

    const checkZoneInfection = (coordinates, age, currentInfectionDegree) => {
        let infectionDegree = currentInfectionDegree;
        if(coordinates.lng && coordinates.lat !== undefined) {
            for (const zoneData of zone) {
                const zoneCenter = turf.point([zoneData.lng, zoneData.lat]);
                const personPoint = turf.point([coordinates.lng, coordinates.lat]);
                const option = "kilometers";
                const distance = turf.distance(zoneCenter, personPoint, option);
                const distanceInMeters = Math.round(distance * 1000);
                if (distanceInMeters <= zoneData.radius) {
                    if (age >= 50) {
                        infectionDegree = 20; // High infection degree for age 50 and above
                    } else if (age >= 30) {
                        infectionDegree = 15; // Moderate infection degree for age 30-59
                    } else {
                        infectionDegree = 10;
                    }
                    break;
                }
            }
            people.forEach((person) => {
                if (person.currentPosition && person.currentPosition.lat !== undefined && person.currentPosition.lng !== undefined) {
                    const otherCoordinates = person.currentPosition;
                    const otherInfectionDegree = person.infectionDegree;
                    infectionDegree = checkPersonInfection(coordinates, infectionDegree, otherCoordinates, otherInfectionDegree);
                }
            });
        }
        return infectionDegree;
    };
    const infectPerson = (person) => {
        const infectedPerson = { ...person };
        infectedPerson.infectionDegree = person.infectionDegree / 2;
        return infectedPerson;
    };
    const handlePathUpdate = (person) => {
        const path = pedestrianPaths.features[Math.floor(Math.random() * pedestrianPaths.features.length)];
        const startPosition = path.geometry.coordinates[0];
        const destination = path.geometry.coordinates[path.geometry.coordinates.length - 1];
        const distance = turf.distance(
            [startPosition[1], startPosition[0]],
            [destination[1], destination[0]]
        );
        const duration = Math.floor(Math.random() * 30000) + 10000;
        const speed = 0.00122;
        const age = Math.floor(Math.random() * (60-14+1) + 14);
        const newPosition = {
            lat: startPosition[1],
            lng: startPosition[0],
        };
        const infectionDegree = person.infectionDegree || 0;
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
            age,
            infectionDegree,
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
                    key: `person-${Math.floor(people.length + index)}`,
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
                                    }
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
    useEffect(() => {
        // Update infected and uninfected counts when people change
        const infected = people.filter((person) => person.infectionDegree > 0);
        setInfectedCount(infected.length);
        setUninfectedCount(people.length - infected.length);
    }, [people]);
    return (
        <>
            {isSimulationRunning && people.length > 0 &&
                people.map((person) => {
                    if(person.currentPosition &&
                        person.currentPosition.lat !== undefined &&
                        person.currentPosition.lng !== undefined)
                    {
                       person.infectionDegree = checkZoneInfection(person.currentPosition, person.age, person.infectionDegree);
                        return (<Marker
                            key={person.key}
                            position={person.currentPosition}
                            icon={L.icon({
                                iconUrl: person.infectionDegree > 0 ? IconInfectedMan : iconMan,
                                iconSize: [32, 32],
                            })}
                        >
                            <Popup>
                                key: {person.key}
                                <br/>
                                age: {person.age}
                                <br/>
                                infected: {person.infectionDegree} %
                            </Popup>
                        </Marker>)
                    }
                })}
            {isSimulationRunning && (
                zone.map((zones, index) => (
                    <Circle
                        key={index}
                        center={[zones.lat, zones.lng]}
                        radius={zones.radius}
                        pathOptions={{ color: "red" }}
                        
                    >
                        <Popup>
                            radius: {zones.radius} meters
                            <br />
                            type: {zones.type}
                        </Popup>
                    </Circle>
                ))
            )}
        </>
    );

};

export default Human;
