import { BrowserRouter, Routes, Route } from "react-router";
import Dashboard from "./components/Dashboard";
import YoutubePlayer from "./components/YoutubePlayer";

function App(){


    return(


    <>
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/room/:roomId" element={<YoutubePlayer/> } />
    </Routes>
  </BrowserRouter>
        
    </>

    );

}

export default App;