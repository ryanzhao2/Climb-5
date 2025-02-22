#Inspiration

The inspiration for Climb 5 came from our passion for climbing and the desire to make climbing routes more accessible and interactive for everyone. We wanted to create a tool that could help climbers visualize and plan climbs tailored to their abilites in an engaging 3D environment, making it easier to strategize movements and learn new techniques, with applications to outdoor climbing.

#What it does

Climb 5 is an interactive climbing route planner that allows users to create, visualize, and simulate climbing routes on a 3D wall model. Users can place holds, define their types (Jug, Crimp, Nub), and connect them to visualize possible climbing paths, aswell as inputting their height to the application. Based on this information, Climb 5 will calculate all possible routes that the climber is able to geometrically accomplish, and selects the safest and most physically-stable solution. The app also features an animation to simulate different limb movements along the routes, helping climbers further understand the best sequence for each route.

#How we built it

We built Climb 5 using React for the frontend and Three.js with @react-three/fiber for rendering the 3D climbing wall and holds. The backend was created with Python and interpreted using Flask, which handles all geometric verifcations and calculations for climbing routes within the climbing algorithm. We also integrated MUI for styling and used the GLTFLoader from Three.js to handle 3D models. The frontend and backend communicate via REST APIs to calculate routes and analyze movement possibilities.

In the future we would like to implement a more modular hold system that give us room for a more nuanced pathing algorithm, such as hold size, hold type, and hold orientation. In addition to this, we would have liked to cloud host this for users to use on their smartphones, further increasing the ease of access for new climbers! Everything is next for Climb 5.
