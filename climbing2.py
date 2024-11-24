import math
import json
from math import sqrt

# Connection between react frontend and backend
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/endpoint', methods=['POST'])
def receive_json():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    try:
        holds = parse_holds(data)
        top_hold = find_top_hold(holds)
        result = climbing_algorithm(holds, top_hold["id"])

        if result["success"]:
            response = {"paths": result["paths"]}
            print("Computed paths:", result["paths"])  # Print paths to terminal
            return jsonify(response), 200
        else:
            print("Climbing algorithm failed. No paths found.")
            return "", 204
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

height = 5  # Height in meters

# Functions for climbing logic and geometry calculations
def node_distance(node1, node2):
    """Calculate Euclidean distance between two 3D nodes."""
    return sqrt(sum((c1 - c2) ** 2 for c1, c2 in zip(node1, node2)))

def center_of_mass(positions):
    """
    Calculate the center of mass based on limb positions.
    Weighted to approximate human body center.
    """
    hand_weight = 0.4
    foot_weight = 0.2
    total_weight = hand_weight * 2 + foot_weight * 2

    x_com = (
        hand_weight * (positions["left_hand"][0] + positions["right_hand"][0])
        + foot_weight * (positions["left_foot"][0] + positions["right_foot"][0])
    ) / total_weight

    y_com = (
        hand_weight * (positions["left_hand"][1] + positions["right_hand"][1])
        + foot_weight * (positions["left_foot"][1] + positions["right_foot"][1])
    ) / total_weight

    z_com = (
        hand_weight * (positions["left_hand"][2] + positions["right_hand"][2])
        + foot_weight * (positions["left_foot"][2] + positions["right_foot"][2])
    ) / total_weight

    return [x_com, y_com, z_com]

def within_reach(center, hold, max_reach):
    """Check if a hold is within reach of a center position."""
    return node_distance(center, hold) <= max_reach

def isHoldValidFunction(current_positions, limb_to_move, new_hold_position, hold_type):
    """
    Check if moving a limb to the new hold results in a valid body configuration.
    """
    # Restriction: If the hold is a nub, hands shouldn't go on it.
    if limb_to_move in ["left_hand", "right_hand"] and hold_type == "nub":
        return False
    
    # Restriction: If the hold is a crimp, avoid hands without stable feet.
    if limb_to_move in ["left_hand", "right_hand"] and hold_type == "crimp":
        if node_distance(current_positions["left_foot"], current_positions["right_foot"]) > 0.5 * height:
            return False

    updated_positions = current_positions.copy()
    updated_positions[limb_to_move] = new_hold_position

    rh = updated_positions.get("right_hand")
    lh = updated_positions.get("left_hand")
    rf = updated_positions.get("right_foot")
    lf = updated_positions.get("left_foot")

    # Body dimensions
    arm_length = 0.5 * height
    leg_length = 0.5 * height
    max_reach = height * 1.35  # Vertical reach
    max_horizontal_reach = height * 0.5  # Sideways reach

    # Calculate center of mass and reach constraints
    body_center = center_of_mass(updated_positions)

    # Check all limbs are within reach of their respective centers
    if not within_reach(body_center, rh, arm_length):
        return False
    if not within_reach(body_center, lh, arm_length):
        return False
    if not within_reach(body_center, rf, leg_length):
        return False
    if not within_reach(body_center, lf, leg_length):
        return False

    # Check that body center remains within valid reach triangle
    if node_distance(updated_positions["left_hand"], updated_positions["right_hand"]) > arm_length * 2:
        return False
    if node_distance(updated_positions["left_foot"], updated_positions["right_foot"]) > leg_length * 2:
        return False
    if node_distance(updated_positions["left_hand"], updated_positions["left_foot"]) > max_reach:
        return False
    if node_distance(updated_positions["right_hand"], updated_positions["right_foot"]) > max_reach:
        return False

    return True

def parse_holds(data):
    """
    Parses the JSON object containing hold data and returns a list of hold dictionaries.
    """
    try:
        # Expecting 'holds' to be a key in the input JSON
        holds = data.get("holds")
        if not isinstance(holds, list):
            raise ValueError("Holds must be a list.")

        parsed_holds = []
        for hold in holds:
            hold_id = int(hold["id"])
            position = hold["position"]
            hold_type = hold.get("type", "unknown")  # Added hold type, default to "unknown"
            
            if not isinstance(position, list) or len(position) != 3:
                raise ValueError(f"Invalid position for hold ID {hold_id}: {position}")
            
            parsed_holds.append({"id": hold_id, "position": position, "type": hold_type})

        return parsed_holds
    except AttributeError as e:
        raise ValueError(f"Invalid data format: {e}")
    except KeyError as e:
        raise ValueError(f"Missing key in data: {e}")
    except (TypeError, ValueError) as e:
        raise ValueError(f"Invalid data format: {e}")

def find_top_hold(holds):
    """
    Finds the hold with the highest y-coordinate (upward direction).
    """
    if not holds:
        raise ValueError("The holds list is empty.")

    top_hold = max(holds, key=lambda hold: hold["position"][1])  # Use y-coordinate
    return top_hold

def assign_start_positions(holds):
    """
    Assign starting positions for left/right hands and feet based on y-coordinates (smallest).
    - Feet: Two smallest y-values, left foot gets smaller x.
    - Hands: Next two smallest y-values, left hand gets smaller x.
    """
    # Sort holds by y-coordinate, then x-coordinate for ties
    sorted_holds = sorted(holds, key=lambda h: (h["position"][1], h["position"][0]))

    if len(sorted_holds) < 4:
        raise ValueError("Not enough holds to assign to all limbs.")

    # Assign positions based on sorted y-values
    left_foot = sorted_holds[0]["position"]  # Smallest y, smallest x
    right_foot = sorted_holds[1]["position"]  # Smallest y, second smallest x
    left_hand = sorted_holds[2]["position"]  # Next smallest y, smallest x
    right_hand = sorted_holds[3]["position"]  # Next smallest y, second smallest x

    return {
        "left_foot": left_foot,
        "right_foot": right_foot,
        "left_hand": left_hand,
        "right_hand": right_hand,
    }

def climbing_algorithm(holds, top_hold_id):
    """
    Perform climbing algorithm with backtracking, outputting paths as hold IDs.
    Prefer keeping legs on separate holds if possible, ensuring stability.
    """
    limb_names = ["left_hand", "right_hand", "left_foot", "right_foot"]

    # Map positions to hold IDs for reverse lookup
    position_to_id = {tuple(hold["position"]): hold["id"] for hold in holds}

    # Assign starting positions based on x-values
    start_positions = assign_start_positions(holds)

    # Initialize paths with hold IDs
    paths = {limb: [] for limb in limb_names}
    for limb in limb_names:
        position = start_positions[limb]
        hold_id = position_to_id[tuple(position)]
        paths[limb].append(hold_id)  # Store ID instead of position

    visited = {limb: set() for limb in limb_names}
    for limb in limb_names:
        position = start_positions[limb]
        visited[limb].add(tuple(position))  # Use position as tuple for set compatibility

    current_positions = start_positions.copy()
    move_count = 0  # Track the total number of moves

    def backtrack(current_positions, limb_index):
        nonlocal move_count
        limbs_on_top_hold = [
            limb
            for limb, pos in current_positions.items()
            if pos == top_hold_position
        ]
        if len(limbs_on_top_hold) >= 2:
            return True

        if limb_index >= len(limb_names):
            return False

        limb = limb_names[limb_index]
        limb_pos = current_positions[limb]

        # Alternate hands and feet
        limb_type = "hand" if limb_index % 2 == 0 else "foot"

        # Filter holds based on reachability and limb type
        possible_holds = [
            hold
            for hold in holds
            if tuple(hold["position"]) not in visited[limb]
            and within_reach(center_of_mass(current_positions), hold["position"], height)
            and (
                ("hand" in limb and hold["position"][1] > limb_pos[1])  # Hands prefer upward moves
                or ("foot" in limb and hold["position"][1] >= limb_pos[1] - 0.5)  # Feet can move slightly higher
            )
        ]

        # Sort possible holds by y-distance for stability, prefer separate feet holds at slightly different y-values
        if limb_type == "foot":
            possible_holds.sort(key=lambda hold: (hold["position"][1], abs(hold["position"][1] - limb_pos[1]), -hold["position"][0]))
        else:
            possible_holds.sort(key=lambda hold: abs(hold["position"][1] - limb_pos[1]))

        for hold in possible_holds:
            new_hold_pos = hold["position"]
            hold_type = hold.get("type", "unknown")

            if isHoldValidFunction(current_positions, limb, new_hold_pos, hold_type):
                current_positions[limb] = new_hold_pos
                hold_id = position_to_id[tuple(new_hold_pos)]
                paths[limb].append(hold_id)  # Append hold ID
                visited[limb].add(tuple(new_hold_pos))  # Use tuple for set compatibility
                move_count += 1

                # Ensure all paths are updated for consistency
                for other_limb in limb_names:
                    if other_limb != limb:
                        paths[other_limb].append(paths[other_limb][-1])  # Maintain previous position

                if backtrack(current_positions, (limb_index + 1) % len(limb_names)):
                    return True

                # Backtrack: revert positions and paths
                current_positions[limb] = limb_pos
                paths[limb].pop()
                visited[limb].remove(tuple(new_hold_pos))
                move_count -= 1

        return False

    top_hold = next((hold for hold in holds if hold["id"] == top_hold_id), None)
    if not top_hold:
        raise ValueError(f"Top hold with ID {top_hold_id} not found.")
    top_hold_position = top_hold["position"]

    success = backtrack(current_positions, 0)

    # Ensure all paths are padded to the same length as the total moves
    for limb in limb_names:
        while len(paths[limb]) < move_count:
            paths[limb].append(paths[limb][-1])  # Maintain last hold ID

    return {"success": success, "paths": paths, "start_positions": start_positions}

if __name__ == "__main__":
    app.run(debug=True)