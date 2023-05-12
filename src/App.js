import React, { useEffect, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    GeoJSON,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./app.css";
import {CircleMarker} from "react-leaflet/CircleMarker"
import osmtogeojson from "osmtogeojson";
import L from "leaflet";
import ManIcon from './components/human/resources/man.svg'
// Import marker icon image files
import iconUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import Human from "./components/human/Human";
import ZoneForm from "./components/ZoneForm/ZoneForm";

// Update default icon object
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconUrl,
    iconUrl: iconUrl,
    shadowUrl: iconShadowUrl,
});
const SECONDS_PER_HOUR = 1;
const App = () => {
    const defaultPosition = [54.8463, 83.0884];
    const [pedestrianPaths, setPedestrianPaths] = useState(null);
    const [isSimulationRunning, setIsSimulationRunning] = useState(false);
    const [simulationTime, setSimulationTime] = useState(new Date("2023-04-18T00:00:00"));
    const [simulationDays, setSimulationDays] = useState(1);
    const [numPeople, setNumPeople] = useState(100);
    const [updateSimulation, setUpdateSimulation] = useState(false);
    const [zoneFormVisible, setZoneFormVisible] = useState(false);
    const [menuFormVisible, setMenuFormVisible] = useState("visible");
    const [zoneLat, setZoneLat] = useState(0.0);
    const [zoneLng, setZoneLng] = useState(0.0);
    const [zoneRad, setZoneRad] = useState(0);
    const [zoneTime, setZoneTime] = useState(0);
    const [zone, setZone] = useState([]);
    console.log(zone);
    useEffect(() => {
        const fetchData = async () => {
            const response = await fetch(
                "https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3B%0A%28%0A%20%20way%5B%27highway%27%3D%27footway%27%5D%5B%27bicycle%27%21~%27.*%27%5D%5B%27horse%27%21~%27.*%27%5D%2854.83389%2C83.09635%2C54.84389%2C83.11635%29%3B%0A%20%20way%5B%27highway%27%3D%27cycleway%27%5D%2854.83389%2C83.09635%2C54.84389%2C83.11635%29%3B%0A%20%20way%5B%27highway%27%3D%27bridleway%27%5D%2854.83389%2C83.09635%2C54.84389%2C83.11635%29%3B%0A%20%20way%5B%27highway%27%3D%27path%27%5D%2854.83389%2C83.09635%2C54.84389%2C83.11635%29%3B%0A%29%3B%0A%2F*added%20by%20auto%20repair*%2F%0A%28._%3B%3E%3B%29%3B%0A%2F*end%20of%20auto%20repair*%2F%0Aout%3B\n"
            );
            const data = await response.json();
            const geojson = osmtogeojson(data);
            setPedestrianPaths(geojson);
        };
        fetchData();
    }, []);

    useEffect(() => {
        let timerId = null;
        if (isSimulationRunning) {
            timerId = setInterval(() => {
                setSimulationTime((prevTime) => {
                    const newTime = new Date(prevTime.getTime() + 60 * 60 * 1000 / SECONDS_PER_HOUR);
                    if (newTime.getTime() >= new Date("2023-04-18T00:00:00").getTime() + simulationDays * 24 * 60 * 60 * 1000) {
                        setIsSimulationRunning(false);
                        clearInterval(timerId);
                        return prevTime;
                    }
                    return newTime;
                });
            }, 1000);
        }
        return () => {
            clearInterval(timerId);
        };
    }, [isSimulationRunning, simulationDays]);

    const handleSimulationToggle = () => {
        setIsSimulationRunning(!isSimulationRunning);
        setUpdateSimulation(false)
    }

    const handleSimulationDaysChange = (event) => {
        const value = parseInt(event.target.value, 10);
        setSimulationDays(isNaN(value) ? 0 : value);
    };
    const handlePeopleChange = (event) => {
        setNumPeople(event.target.value)
    };

    const handleZoneLatChange = (event) => {
        setZoneLat(event.target.value);
    }

    const handleZoneLngChange = (event) => {
        setZoneLng(event.target.value);
    }

    const handleZoneRadChange = (event) => {
        setZoneRad(event.target.value)
    }

    const handleZoneTimeChange = (event) => {
        setZoneTime(event.target.value)
    }

    const handleAddZone = () => {
        const PollutionZone = {lat: zoneLat, lng: zoneLng, radius: zoneRad, time: zoneTime}
        setZone((prevZone) => [...prevZone, PollutionZone]);
        setZoneLat(0.0);
        setZoneLng(0.0);
        setZoneRad(0);
        setZoneTime(0);
    }

    const handleZoneFormVisible = () => {
        setZoneFormVisible(true);
        setMenuFormVisible("hidden");
    }
    const handleZoneFormClose = () => {
        setZoneFormVisible(false);
        setMenuFormVisible("visible");
    }
    const handleUpdateSimulation = () => {
        setUpdateSimulation(true);
        setSimulationTime(new Date("2023-04-18T00:00:00"));
        setSimulationDays(1);
        setIsSimulationRunning(false);
        setNumPeople(100)
        setZone([]);
    };

    const isNightTime = (time) => {
        const hours = time.getHours();
        return hours >= 22 || hours < 6;
    };

    return (
        <div className="app">
            <div className="map">
                <MapContainer center={defaultPosition} zoom={15} className="map-container">
                    <TileLayer
                        url={isNightTime(simulationTime) ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                    />
                    {zone.map((zones, index) => (
                        <CircleMarker
                            key={index}
                            center={[zones.lat, zones.lng]}
                            radius={zones.radius}
                            pathOptions={{ color: "red" }}
                        />
                    ))}
                    {pedestrianPaths && (
                        <Human pedestrianPaths={pedestrianPaths} isSimulationRunning={isSimulationRunning} numPeople={numPeople} simulationUpdate={updateSimulation} simulationTime={simulationTime}/>)
                    }
                </MapContainer>

            </div>
            <div className="rightMenu">
                <ZoneForm visible={zoneFormVisible}>
                    <div className="Lat">
                        <label style={{color: "white", fontSize: 20}}>lat: </label>
                        <input className="zoneLat" type="number" value={zoneLat} onChange={handleZoneLatChange}/>
                    </div>
                    <div className="Lng">
                        <label style={{color: "white", fontSize: 20}}>lng: </label>
                        <input className="zoneLng" type="number" value={zoneLng} onChange={handleZoneLngChange}/>
                    </div>
                    <div className="Rad">
                        <label style={{color: "white", fontSize: 20}}>radius: </label>
                        <input className="zoneRad" type="number" value={zoneRad} onChange={handleZoneRadChange}/>
                    </div>
                    <div className="TimeZone">
                        <label style={{color: "white", fontSize: 20}}>time: </label>
                        <input className="zoneTime" type="number" value={zoneTime} onChange={handleZoneTimeChange}/>
                    </div>
                    <button className="addPollZone" onClick={handleAddZone}>Add</button>
                    <button onClick={handleZoneFormClose}>Close Form</button>
                </ZoneForm>
                <div className="Menu" style={{visibility: menuFormVisible}}>
                    <h1>MoniPoll</h1>
                    <button className="start" onClick={handleSimulationToggle}>{isSimulationRunning ? 'Stop Simulation' : 'Start Simulation'}</button>
                    <button className="update" onClick={handleUpdateSimulation}>Update Simulation</button>
                    {isSimulationRunning ?
                        <label style={{color: "white", fontSize: 20}} className="time">{simulationTime.toLocaleString()}</label>
                        :
                        <label style={{color: "white", fontSize: 20}}>
                            Simulation Days:
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={simulationDays}
                                onChange={handleSimulationDaysChange}
                            />
                        </label>
                    }
                    <div className="control-group">
                        <label htmlFor="numPeople" style={{color: "white", fontSize: 18}}>Number of People:</label>
                        <input type="number" id="numPeople" name="numPeople" min="50" defaultValue={numPeople} onBlur={handlePeopleChange} />
                    </div>
                    <button className="addZone" onClick={handleZoneFormVisible}>Add Zone</button>
                </div>
            </div>
        </div>
    );
};

export default App;