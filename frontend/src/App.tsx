import React, { useState, useRef, useEffect, createContext, useContext, Dispatch, SetStateAction } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Plane, Sphere, Text } from "@react-three/drei";
import PinDropIcon from '@mui/icons-material/PinDrop';
import Logo from './logo.svg';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  SpeedDial,
  SpeedDialAction,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Input,
  Slider,
  Fab,
  IconButton,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ClearIcon from "@mui/icons-material/Clear";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { ChromePicker } from "react-color";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
//import "./styles.css"; // Add a CSS file for logo-specific styling

// Create a Context for the animation controls
type AnimationControlContextType = {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  stepForward: boolean;
  setStepForward: Dispatch<SetStateAction<boolean>>;
};

const AnimationControlContext = createContext<AnimationControlContextType>({
  isPlaying: false,
  setIsPlaying: () => {},
  stepForward: false,
  setStepForward: () => {},
});

// Types for Holds and Connections
type Hold = {
  id: number;
  position: [number, number, number];
  color: string;
  type: "Jug" | "Crimp" | "Nub";
};

type Connection = {
  startId: number;
  endId: number;
  color: string;
};

const limbColors = {
  "left_hand": "red",
  "right_hand": "blue",
  "left_foot": "green",
  "right_foot": "yellow",
};

// Legend component
const Legend = () => (
  <Box
    sx={{
      position: "absolute",
      top: 100,
      right: 30,
      backgroundColor: "transparent",
      padding: 2,
      borderRadius: 2,
      boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
    }}
  >
    <Typography variant="h6" gutterBottom sx={{ color: "white" }}>
      Colors
    </Typography>
    {Object.entries(limbColors).map(([limb, color], index) => (
      <Box key={index} sx={{ display: "flex", alignItems: "center", marginBottom: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: color,
            borderRadius: "50%",
            marginRight: 1,
            border: "1px solid #000",
          }}
        />
          <Typography variant="body2" sx={{ color: "white" }}>
          {limb}
        </Typography>
      </Box>
    ))}
  </Box>
);

const renderLineBetweenPoints = (
  startPoint: [number, number, number],
  endPoint: [number, number, number],
  color = "blue",
  linewidth = 10
) => {
  const points = new Float32Array([
    startPoint[0], startPoint[1], startPoint[2],
    endPoint[0], endPoint[1], endPoint[2],
  ]);

  return (
    <line key={`${startPoint}-${endPoint}`}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={points}
          itemSize={3}
          count={2}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={linewidth} />
    </line>
  );
};

// Animated Sphere Component
const AnimatedSphere = ({ path, limb, color }: { path: [number, number, number][], limb: string, color: string }) => {
  const sphereRef = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);
  const animationContext = useContext(AnimationControlContext);
  if (!animationContext) {
    throw new Error('AnimationControlContext must be used within a Provider');
  }

  const { isPlaying, stepForward } = animationContext;

  useFrame((_, delta) => {
    if (path.length < 2) return;

    if (stepForward) {
      setProgress((prev) => Math.min(prev + 0.01, 1));
    } else if (isPlaying) {
      setProgress((prev) => (prev + delta * 0.2) % 1); // Increased speed by changing delta multiplier to 0.2
    }

    // Calculate the position along the path
    const currentSegment = Math.floor(progress * (path.length - 1));
    const nextSegment = (currentSegment + 1) % path.length;
    const segmentProgress = (progress * (path.length - 1)) % 1;

    const start = path[currentSegment];
    const end = path[nextSegment];
    const interpolatedPosition = start.map((coord, index) =>
      coord + (end[index] - coord) * segmentProgress
    );

    if (sphereRef.current) {
      sphereRef.current.position.set(
        interpolatedPosition[0],
        interpolatedPosition[1],
        interpolatedPosition[2]
      );
    }
  });

  return (
    <group>
      <Sphere ref={sphereRef} args={[0.3]}>
        <meshStandardMaterial color={color} />
      </Sphere>
      {/* <Text
        position={[path[0][0], path[0][1] + 0.5, path[0][2]]}
        fontSize={0.2}
        color="black"
      >
        {limb}
      </Text> */}
    </group>
  );
};

// Animation Controls Component
const AnimationControls = () => {
  const animationContext = useContext(AnimationControlContext);

  const { isPlaying, setIsPlaying, setStepForward } = animationContext;

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
    setStepForward(false);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setStepForward(true);
  };

  return (
    <Box sx={{ position: "absolute", bottom: 80, left: 16 }}>
   <IconButton
      sx={{
        backgroundColor: "white", // White background for the button
        color: "black", // Icon color
        "&:hover": {
          backgroundColor: "rgba(200, 200, 200, 1)", // Slightly gray on hover
        },
        border: "1px solid rgba(0, 0, 0, 0.1)", // Optional subtle border for definition
      }}
      onClick={handlePlayPause}
    >
      {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
    </IconButton>
    <IconButton
      sx={{
        backgroundColor: "white", // White background for the button
        color: "black", // Icon color
        "&:hover": {
          backgroundColor: "rgba(200, 200, 200, 1)", // Slightly gray on hover
        },
        border: "1px solid rgba(0, 0, 0, 0.1)", // Optional subtle border for definition
      }}
      onClick={handleStepForward}
    >
      <SkipNextIcon />
    </IconButton>
  </Box>
);
};

// Main Component
const ClimbingRoute3DApp = () => {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [holdIdCounter, setHoldIdCounter] = useState(1);
  const [selectedHoldId, setSelectedHoldId] = useState<number | null>(null);
  const [notification, setNotification] = useState({ open: false, message: "" });
  const [colorToChange, setColorToChange] = useState<string>("#000000");
  const [openColorPicker, setOpenColorPicker] = useState(false);
  const [backgroundModel, setBackgroundModel] = useState<THREE.Group | null>(null);
  const [animatedPaths, setAnimatedPaths] = useState<{ path: [number, number, number][], limb: string, color: string }[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepForward, setStepForward] = useState(false);
  const [modelScale, setModelScale] = useState(1);
  const orbitControlsRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAddHold = (e: any) => {
    e.stopPropagation();
    if (e.point) {
      const [x, y, z] = e.point.toArray();
      setHolds((prev) => [...prev, { id: holdIdCounter, position: [x, y, z], color: "#000000", type: "Jug" }]);
      setHoldIdCounter((prev) => prev + 1);
    }
  };

  const handleRemoveHold = () => {
    if (selectedHoldId !== null) {
      setHolds((prev) => prev.filter((hold) => hold.id !== selectedHoldId));
      setConnections((prev) =>
        prev.filter(
          (connection) =>
            connection.startId !== selectedHoldId && connection.endId !== selectedHoldId
        )
      );
      setSelectedHoldId(null);
      setNotification({ open: true, message: "Hold removed!" });
    }
  };

  const clearHolds = () => {
    setHolds([]);
    setConnections([]);
    setAnimatedPaths([]);
    setHoldIdCounter(1);
    setNotification({ open: true, message: "All holds cleared!" });
  };

  const resetZoom = () => {
    orbitControlsRef.current?.reset();
    setNotification({ open: true, message: "Zoom reset!" });
  };

  const exportHolds = async () => {
    if (holds.length === 0) {
      setNotification({ open: true, message: "No holds to export!" });
      return;
    }

    try {
      const payload = { holds };
      const response = await fetch("http://127.0.0.1:5000/endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        if (response.status === 204) {
          setNotification({ open: true, message: "No paths found by the algorithm." });
          return;
        }
        throw new Error("Export failed!");
      }

      const result = await response.json();
      if (result.paths) {
        const newConnections: Connection[] = [];
        const animatedPathsData: { path: [number, number, number][], limb: string, color: string }[] = [];
        const pathKeys = Object.keys(result.paths);
        pathKeys.forEach((limb) => {
          const color = limbColors[limb as keyof typeof limbColors];
          const ids = result.paths[limb];
          const path: [number, number, number][] = [];
          for (let i = 0; i < ids.length - 1; i++) {
            newConnections.push({ startId: ids[i], endId: ids[i + 1], color });
          }
          ids.forEach((id: number) => {
            const hold = holds.find((h) => h.id === id);
            if (hold) path.push(hold.position);
          });
          animatedPathsData.push({ path, limb, color });
        });
        setConnections(newConnections);
        setAnimatedPaths(animatedPathsData);
        setNotification({ open: true, message: "Paths received successfully!" });
      } else {
        setNotification({ open: true, message: "Export successful but no paths received." });
      }
    } catch (error) {
      console.error("Export failed:", error);
      setNotification({ open: true, message: "Export failed!" });
    }
  };

  const changeHoldColor = (color: string) => {
    if (selectedHoldId !== null) {
      setHolds((prev) =>
        prev.map((hold) => (hold.id === selectedHoldId ? { ...hold, color } : hold))
      );
      setNotification({ open: true, message: "Hold color changed!" });
      setOpenColorPicker(false);
    }
  };

  return (
    <AnimationControlContext.Provider value={{ isPlaying, setIsPlaying, stepForward, setStepForward }}>
      <Box
        sx={{
          width: "100%",
          height: "100vh",
          background: "linear-gradient(to right, #ff9a9e, #fad0c4, #fad0c4, #ff9a9e)",
        }}
      >
<AppBar position="static" sx={{ backgroundColor: "transparent", boxShadow: "none" }}>
  <Toolbar>
    <Box
      component="img"
      src={Logo}
      alt="Logo"
      sx={{
        height: 40, // Adjust the size of your logo as needed
        marginRight: 2, // Adds spacing to the right of the logo if needed
      }}
    />
    <Typography variant="h5" sx={{ color: "transparent", flexGrow: 1 }}>
      {/* Optional title text or leave this empty */}
    </Typography>
  </Toolbar>
</AppBar>



        <Legend />

        {/* Speed Dial */}

<SpeedDial
  ariaLabel="Menu Actions"
  sx={{
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "transparent", // White background for the button
    "& .MuiFab-primary": {
      backgroundColor: "white", // Ensure the SpeedDial FAB is white
      color: "black", // Black icon color
      "&:hover": {
        backgroundColor: "rgba(200, 200, 200, 1)", // Slightly gray on hover
      },
    },
  }}
  icon={<SaveIcon sx={{ color: "black" }} />} // Black icon color
>
          <SpeedDialAction icon={<SaveIcon />} tooltipTitle="Export Holds" onClick={exportHolds} />
          <SpeedDialAction 
    icon={<UploadFileIcon />} 
    tooltipTitle="Upload Model" 
    onClick={() => fileInputRef.current?.click()} 
  />          <SpeedDialAction icon={<ClearIcon />} tooltipTitle="Clear Holds" onClick={clearHolds} />
          <SpeedDialAction icon={<ZoomOutMapIcon />} tooltipTitle="Reset Zoom" onClick={resetZoom} />
          <SpeedDialAction icon={<ColorLensIcon />} tooltipTitle="Change Color" onClick={() => setOpenColorPicker(true)} />
          <SpeedDialAction icon={<DeleteIcon />} tooltipTitle="Remove Hold" onClick={handleRemoveHold} />
        </SpeedDial>

        <Box
  sx={{
    position: "absolute",
    top: 100, // Adjust as needed
    left: 20, // Adjust as needed
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent", // Transparent background
    padding: 2,
    zIndex: 1000, // Ensure the box is on top
  }}
>
  <Button
    variant="contained"
    color="primary"
    component="label"
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textTransform: "none",
      fontWeight: "bold",
      backgroundColor: "transparent", // Fully transparent background
      pointerEvents: "auto", // Ensure the button is clickable
    }}
  >
    Upload 3D Model
    <Input
      type="file"
      inputProps={{ accept: ".glb" }}
      onChange={(event) => {
        const fileInput = event.target as HTMLInputElement;
        const file = fileInput.files?.[0];
        if (file && file.name.endsWith(".glb")) {
          const loader = new GLTFLoader();
          loader.load(URL.createObjectURL(file), (gltf) => {
            setBackgroundModel(gltf.scene);
            setNotification({ open: true, message: "3D Model loaded successfully!" });
          });
        } else {
          setNotification({ open: true, message: "Please upload a GLB file!" });
        }
      }}
      sx={{ display: "none" }} // Hide the actual input
    />
  </Button>
</Box>


{/* Scale Slider */}
<Box
  sx={{
    width: 300,
    position: "absolute",
    bottom: 150,
    left: 16,
    zIndex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)", // Semi-transparent white background
    padding: 1,
    borderRadius: 1,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)", // Optional shadow
    backdropFilter: "blur(8px)", // Optional blur effect
  }}
>
  <Typography gutterBottom sx={{ color: "white", fontWeight: "bold" }}>
    Scale Model
  </Typography>
  <Slider
    value={modelScale}
    onChange={(e, newValue) => setModelScale(newValue as number)}
    step={0.1}
    min={0.1}
    max={5}
    valueLabelDisplay="auto"
    sx={{
      color: "white", // Changes the color of the slider track and thumb
      "& .MuiSlider-thumb": {
        border: "2px solid white", // Adds a white border around the slider thumb
      },
      "& .MuiSlider-valueLabel": {
        color: "white", // Ensures value labels are white
        backgroundColor: "rgba(0, 0, 0, 0.5)", // Optional dark background for value labels
      },
    }}
  />
</Box>
        <Canvas camera={{ position: [0, 4, 20], fov: 50 }} style={{ width: "100%", height: "100vh" }}>
          <OrbitControls ref={orbitControlsRef} minDistance={5} maxDistance={30} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />

          {backgroundModel && (
            <primitive
              object={backgroundModel}
              scale={[modelScale, modelScale, modelScale]}
              onPointerDown={(e: any) => handleAddHold(e)}
            />
          )}

          {holds.map((hold) => (
            <Sphere
              key={hold.id}
              args={[0.2]}
              position={hold.position}
              onClick={() => setSelectedHoldId(hold.id)}
            >
              <meshStandardMaterial color={hold.color} />
            </Sphere>
          ))}

          {connections.map((connection, index) => {
            const startHold = holds.find((hold) => hold.id === connection.startId);
            const endHold = holds.find((hold) => hold.id === connection.endId);
            return startHold && endHold ? (
              <React.Fragment key={index}>
                {renderLineBetweenPoints(startHold.position, endHold.position, connection.color, 4)}
              </React.Fragment>
            ) : null;
          })}

          {animatedPaths.map((animatedPathData, index) => (
            <AnimatedSphere key={index} path={animatedPathData.path} limb={animatedPathData.limb} color={animatedPathData.color} />
          ))}
        </Canvas>

        <Snackbar open={notification.open} autoHideDuration={3000} onClose={() => setNotification({ open: false, message: "" })}>
          <Alert severity="success">{notification.message}</Alert>
        </Snackbar>

        <Dialog open={openColorPicker} onClose={() => setOpenColorPicker(false)}>
          <DialogTitle>Pick a Color</DialogTitle>
          <DialogContent>
            <ChromePicker color={colorToChange} onChangeComplete={(color) => setColorToChange(color.hex)} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => changeHoldColor(colorToChange)}>Apply</Button>
            <Button onClick={() => setOpenColorPicker(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        <AnimationControls />
      </Box>
    </AnimationControlContext.Provider>
  );
};

export default ClimbingRoute3DApp;