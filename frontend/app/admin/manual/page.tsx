"use client"

import { useEffect, useState } from "react"
import IntroScreen from "./components/IntroScreen"
import ManualIntro from "./components/ManualIntro"
import SearchBar from "./components/SearchBar"
import TopicTabs from "./components/TopicTabs"
import StepsList, { ManualStep } from "./components/StepList"
import StepDetail from "./components/StepDetails"



interface ManualSubTopic {
  id: string
  label: string
  steps: ManualStep[]
}

interface ManualTopic {
  id: string
  label: string
  steps?: ManualStep[]
  subTopics?: ManualSubTopic[]
}

const TOPICS: ManualTopic[] = [
  {
    id: "login",
    label: "Login",
    steps: [
      {
        id: "login-overview",
        label: "Login Overview",
        description: "This is page is the entry point to the AGOS web dashboard, where the admin enters their registered email and password to access the system. A “Forgot Password?” link is also provided for account recovery.",
        whyItMatters: "Placeholder — explain why live alerts matter.",
        images: ["/admin-manual/login/login-overview.png"],
      },
      {
        id: "login-cont",
        label: "Login User Credentials",
        description: "The login form consists of two fields: the Email field, where the admin enters their registered email address, and the Password field, where the admin enters their account password.",
        whyItMatters: "Placeholder — explain why alert history matters.",
        images: ["/admin-manual/login/login-overview.png"], 
        extraSections: [
          {
            label: "Hide | Unhide password",
            description: " The password field includes an eye icon that toggles visibility, allowing the admin to show or hide the entered characters before logging in.",
            images: ["/admin-manual/login/login-overview.png"],
          },
          {
            label: "Login Button",
            description: "Submits the entered email and password to authenticate the admin. If the credentials are correct, a Data Privacy Notice is shown next before the admin is granted access to the dashboard.",
            images: ["/admin-manual/login/login-overview.png"],
          },
        ],
      },
      {
        id: "data-privacy",
        label: "Data Privacy Notice",
        description: "For new users, this is shown after logging in with valid credentials, presenting the purpose of personal data collection and the user's rights as a data subject under Section 16 of the Data Privacy Act. The admin must check the consent box confirming they have read and understood the notice before clicking “Proceed”.",
        whyItMatters: "Placeholder — explain why live alerts matter.",
        images: ["/admin-manual/login/login-overview.png"],
      },
      {
        id: "change-pword",
        label: "Change Password",
        description: "After clicking “Proceed” in the Data Privacy Notice, this is modal is shown, requiring them to set a new password before proceeding into the system. \n\nThe admin enters their current (temporary) password, then a new password and its confirmation, each with a visibility toggle.",
        whyItMatters: "Placeholder — explain why live alerts matter.",
        images: ["/admin-manual/login/login-overview.png"],
        extraSections: [
          {
            label: "Current Password For New User",
            description: "This is where the user enters their existing (temporary) password issued upon account creation.",
            images: ["/admin-manual/login/login-overview.png"],
          },
          {
            label: "New | Confirm Password",
            description: "Where the user enters their desired new password and confirm it. \n\n The new password must meet the requirements — at least 8 characters, one special character, matching entries, and being different from the current password — are validated in real time via checklist indicators. Clicking “Change Password” submits the update.",
            images: ["/admin-manual/login/login-overview.png"],
          },
          {
            label: "Updating Password Dialog",
            description: "A loading indicator is shown after clicking “Change Password”, confirming that the system is securely processing and saving the new password.",
            images: ["/admin-manual/login/login-overview.png"],
          },
          {
            label: "Changed Password Modal",
            description: "This is a confirmation that the password has been successfully updated and prompts the user to log in again using their new credentials. \n\n Clicking “Go to Login” returns the user to the Login page.",
            images: ["/admin-manual/login/login-overview.png"],
          },
        ],
      },
      {
        id: "login-forgot-pass",
        label: "Forgot Password",
        description: "-",
        whyItMatters: "Placeholder — explain why live alerts matter.",
        extraSections: [
          {
            label: "-",
            description: "-",
          },
        ],
      },
      
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    steps: [
      {
        id: "dashboard-overview",
        label: "Overview of Dashboard",
        description: "The Dashboard provides a centralized overview of the canal monitoring system, displaying system summary using key performance Indicator cards,  the canal network map, live waste classification, live alerts, and reporting progress. It also includes the Sensor Node Health Summary, allowing users to monitor the overall battery voltage, 4G signal strength, and sensor continuity of active nodes.",
        whyItMatters: "Placeholder — explain why the dashboard overview matters.",
      },
      {
        id: "notif-bell",
        label: "Notification Bell",
        description: "-",
        whyItMatters: "Placeholder — explain why the widgets matter.",
        extraSections: [
          {
            label: "Notification",
            description: "",
          },
          {
            label: "Redirect to Alerts Tab",
            description: "",
          },
          
        ],
      },
      {
        id: "dashboard-summary-cards",
        label: "Summary Cards",
        description: "These Key Performance Indicator cards show a summary of metrics such as sensor node count, critical logs, registered barangays, and resolved cases for the month.",
        whyItMatters: "Placeholder — explain why the widgets matter.",
        extraSections: [
          {
            label: "Assigned Sensor Node Card",
            description: "When clicked, it displays the sensor nodes currently assigned to specific barangays.",
          },
          {
            label: "Critical Clogs Card",
            description: "When clicked, it displays the number an details of canal clogging incidents that require immediate attention.",
          },
          {
            label: "Registered Barangay Card",
            description: "When clicked, it displays the total number and list of barangays registered in the system.",
          },
          {
            label: "Resolved This Month Card",
            description: "When clicked, it displays the total number and list of canal clogs that have been successfuly resolved by teh barangays during the current month.",
          },
        ],
      },
      {
        id: "canal-net-map",
        label: "Canal Network Map",
        description: "This shows the entire map of Rosario La Union. ",
        whyItMatters: "Placeholder — explain why filtering matters.",
        extraSections: [
          {
            label: "Clicking a Node",
            description: "Clicking a sensor node on the map enables the user to view its node name, location, water level, and clog percentage",
          },
          {
            label: "Zoom In | Zoom Out",
            description: "Zoom In: Click the Plus (+) button to zoom in on the map. This allows users to view the canal network and sensor locations in greater detail and at a closer scale. \nZoom Out: Click the Minus (-) button to zoom out of the map. This allows users to view a wider area of the canal network and surrounding locations at a larger scale.",
          },
          {
            label: "Map Risk Level Legend",
            description: "Live Risk Level legend uses color-coded labels to help users quickly identify the condition and priority level of each monitored location. \n\nGray - Sleep Mode: Indicates that the sensor node is currently inactive or in sleep mode and is not actively monitoring the canal. \nBlue - Normal: Indicates that the canal is operating under normal conditions, with no immediate risk detected. \nOrange - Warning: Indicates that an unusual or potentially hazardous condition has been detected. Users should monitor the location and consider taking preventive action. \nRed - Critical: Indicates a high-risk or potentially severe canal condition that requires immediate attention and appropriate intervention.",
          },
          
          
        ],
      },
      {
        id: "live-waste-classification",
        label: "Live Waste Classification",
        description: "This is the Live Waste Classification feed, listing recent sensor readings where each card shows the dominant waste category (biodegradable or recyclable in this case) as detected by the AI model, along with its confidence score, sensor/node ID, and detection timestamp — with residual and special waste as the other possible dominant categories that could appear depending on which one the model finds most prevalent in that reading.",
        whyItMatters: "Placeholder — explain why filtering matters.",
        extraSections: [
          {
            label: "Selected Waste Classification Reading",
            description: "This is the detail view that opens when a user tap a reading card: it shows the node ID, barangay, detection timestamp, and confidence score for that reading, along with the estimated waste volume and a full composition breakdown showing the percentage of recyclable, biodegradable, residual, and special waste detected — with the dominant category (biodegradable, at 50.2% here) displayed as the card's overall classification label.",
          },
        ],
      },
      {
        id: "live-alerts",
        label: "Live Alerts",
        description: "This shows the Live Alerts section displays real-time notifications generated by the canal monitoring system. It allows users to quickly identify potential hazards, sensor issues, and changes in canal conditions that may require attention. \n\nRed - Critical Clog: Indicates that a critical clog has been detected in the canal and requires immediate attention. \nOrange - Water Level Rising: Indicates that the water level at the monitored location is increasing and may require monitoring or preventive action. \nYellow – Low Battery: Indicates that the battery level of the sensor node is low and may require battery replacement or maintenance. \nPurple – Sensor Failure: Indicates that a sensor node has experienced a failure and may no longer be providing reliable monitoring data. Inspection or maintenance is required. \nBlue – Weak Signal: Indicates that the sensor node has a weak communication signal, which may affect the transmission of monitoring data.",
        whyItMatters: "Placeholder — explain why filtering matters.",
        extraSections: [
          {
            label: "Selected Alert",
            description: "This is the alert detail modal opened from the Live Alerts section: it shows the alert type , the node ID, barangay, and detection timestamp, plus detail fields for severity, water flow status, water level, and water flow rate readings from that sensor node at the time of the alert.",
          },
          
        ],
      },
      
      {
        id: "reporting-progress",
        label: "Reporting Progress",
        description: "The Reporting Progress section provides an overview of the status of reports for the current reporting period. It allows users to monitor how many reports have been verified and how many are not yet submitted.",
        whyItMatters: "Placeholder — explain why filtering matters.",
        extraSections: [
          {
            label: "Reviewed Reports Modal",
            description: "Clicking the Reporting Progress card will show the total number and list of Reviewed Reports for the month. \n\n--",
          },
          
        ],
      },
      {
        id: "sensor-node-health-summary",
        label: "Sensor Node Health Summary",
        description: "This provides an overview of the average health and performance of all active sensor nodes in the system. It helps users monitor key indicators that affect the reliability and connectivity of the sensor nodes",
        whyItMatters: "Placeholder — explain why filtering matters.",
        extraSections: [
          {
            label: "Battery Voltage Card",
            description: "This displays the average battery voltage across all active sensor nodes. The visual bar provides a quick indication of the overall power level, helping users monitor battery status and identify nodes that may require battery maintenance or replacement. If no readings are currently available, the system displays “No data” until readings are received from the active sensor nodes. \n\nClicking this card shows a modal that displays the list of all active sensor nodes in a barangay and its battery voltage.",
          },
          {
            label: "4G Signal Card",
            description: "This displays the average 4G signal strength of all active sensor nodes, measured in dBm. The visual bar provides a quick indication of network connectivity quality, helping users assess the connection between the sensor nodes and the system. If no readings are currently available, the system displays “No data” until readings are received from the active sensor nodes. \n\nClicking this card shows a modal that displays the list of all active sensor nodes in a barangay and its Signal.",
          },
          {
            label: "Sensor Continuity Card",
            description: "This displays the average continuity status of all active sensor nodes. The visual bar provides a quick indication of the overall sensor health, helping users determine whether the sensors are operating consistently and maintaining reliable monitoring. If no readings are currently available, the system displays “No data” until readings are received from the active sensor nodes. \n\n Clicking this card shows a modal that displays the list of all active sensor nodes in a barangay and its sensor continutity status, if it's a Pass or Fail.",
          },
        ]
      },
    ],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    steps: [
      {
        id: "monitoring-overview",
        label: "Overview of Monitoring",
        description: "This page serves as the main interface for tracking the current status of canal sensor nodes in real time. It presents key monitoring data such as occupied nodes, critical events, warnings, normal conditions, water levels, flow rates, and clog levels, live alerts, while providing tools to search, filter, locate, and assess individual sensor nodes.",
        whyItMatters: "Placeholder — explain why the regional map matters.",
        
      },
      {
        id: "date-time",
        label: "Live Date and Time",
        description: "Displays the current date and a continuously updating clock alongside a LIVE status indicator, confirming that the Monitoring page is actively displaying real-time data from the system.",
        whyItMatters: "Placeholder — explain why map layers matter.",
        
      },
      {
        id: "summary-cards-monitoring",
        label: "Summary Cards",
        description: "These shows the summary of the Key Performance Indicator cards such as the occupied nodes, critical events, warning water level, and normal water level.",
        whyItMatters: "Placeholder — explain why map layers matter.",
        
      },
      {
        id: "search-filter-nodes",
        label: "Search and Filter Node | Barangay",
        description: "Users can search for a specific sensor node or barangay, filter the list by All, Critical, Warning, or Normal conditions, and view each node's water level, flow rate, clog percentage, and current condition.",
        whyItMatters: "Placeholder — explain why map layers matter.",
        
      },
      {
        id: "canal-sensor-nodes-tbl",
        label: "Canal Sensor Nodes Table",
        description: "This section displays a detailed list of registered sensor nodes and their current monitoring information. ",
        whyItMatters: "Placeholder — explain why map layers matter.",
        extraSections: [
          {
            label: "View on Map",
            description: "Clicking the “View on map” button opens a map displaying the selected sensor node’s location and Live Risk Level. The panel also shows the node ID, geographic coordinates. \n\nClicking the “Open in Maps” option will redirect you to an external map service, where you can view the sensor node’s exact location and access additional mapping features.",
          },
        ]
      },
      {
        id: "device-status",
        label: "Device Status?",
        description: "--",
        whyItMatters: "Placeholder — explain why map layers matter.",
        
      },
      {
        id: "clog-lvl-legend",
        label: "Clog Level Legend",
        description: "This indicates the severity of clogging detected by the sensor nodes based on the percentage of blockage. It uses color-coded levels to help users quickly identify the current clog condition. \n\nRed - represents Critical (67-100%), indicating a severe level of blockage. \nYellow represents Warning (34–66%), indicating a moderate level of blockage that requires monitoring. \nGreen represents Normal (0-33%), indicating a low or acceptable level of clogging.",
        whyItMatters: "Placeholder — explain why the regional map matters.",
      },
      {
        id: "live-alerts",
        label: "Live Alerts",
        description: "This shows the Live Alerts section displays real-time notifications generated by the canal monitoring system. It allows users to quickly identify potential hazards, sensor issues, and changes in canal conditions that may require attention. \n\nRed - Critical Clog: Indicates that a critical clog has been detected in the canal and requires immediate attention. \nOrange - Water Level Rising: Indicates that the water level at the monitored location is increasing and may require monitoring or preventive action. \nYellow – Low Battery: Indicates that the battery level of the sensor node is low and may require battery replacement or maintenance. \nPurple – Sensor Failure: Indicates that a sensor node has experienced a failure and may no longer be providing reliable monitoring data. Inspection or maintenance is required. \nBlue – Weak Signal: Indicates that the sensor node has a weak communication signal, which may affect the transmission of monitoring data.",
        whyItMatters: "Placeholder — explain why filtering matters.",
      },
    ],
  },
  {
    id: "alerts",
    label: "Alerts",
    steps: [
      {
        id: "alert-notif",
        label: "Alert Notification Overview",
        description: "This provides a centralized view of system notifications and detected events from sensor nodes.",
        whyItMatters: "Placeholder — explain why live alerts matter.",
        
      },
      {
        id: "search-filter-alert",
        label: "Search and Filter Notification",
        description: "Users can search notifications, filter alerts by barangay and date, and select specific alert types such as Water Level Rising, Low/Moderate/Critical Clog, Node Offline, Low Battery, Weak Signal, and Sensor Failure to quickly identify and review relevant alerts.",
        whyItMatters: "Placeholder — explain why alert history matters.",
      },
      {
        id: "notif-tbl",
        label: "Notification Table",
        description: "-",
        whyItMatters: "Placeholder — explain why live alerts matter.",
        extraSections: [
          {
            label: "-",
            description: "-",
          },
        ],
      },
      
    ],
  },
  {
    id: "hotspots",
    label: "Canal Hotspots",
    steps: [
      {
        id: "canal-hotspot",
        label: "Canal Hotspots Management Overview",
        description: "This provides an overview of designated canal hotspots across different barangays, including their total number, availability, and occupancy status.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        
      },
      {
        id: "summary-cards-monitoring",
        label: "Summary Cards",
        description: "-",
        whyItMatters: "Placeholder — explain why map layers matter.",
        
      },
      {
        id: "search-filter-canal-hotspot",
        label: "Search and Filter Canal Hotspots",
        description: ",-",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        
      },
      {
        id: "hotspot-list",
        label: "Hotspot List",
        description: "Hotspot List allows users to search and filter barangays, view existing hotspots, add new hotspots, and navigate between pages of hotspot records.",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
        extraSections: [
          {
            label: "View",
            description: "Clicking the View button expands the row to display the list of hotspots registered under that barangay, showing each hotspot's name, shape, and status.",
          },
          {
            label: "View on Map",
            description: "Clicking the “View on map” opens a modal displaying the hotspot's name and exact location on an interactive map, along with its coordinates and a status legend (Available/Occupied).",
          },
          {
            label: "Zoom In | Zoom Out",
            description: "Users can zoom in/out, close the modal, or click “Open in Maps” to view the location in an external maps application.",
          },
          {
            label: "Hotspot Status Legend",
            description: "This indicates whether a canal hotspot location is currently in use: a gray marker means the hotspot is Available (unoccupied by a sensor node), while a green marker means it is Occupied (currently assigned to a sensor node).",
          },
        ],
      },
      {
        id: "add-hotspot",
        label: "Add Canal Hotspot",
        description: "Clicking the “Add Hotspot” button opens the hotspot registration form, where users can enter the hotspot’s name and description, specify the canal properties such as width, shape, depth, and sensor height, and select its geographic location on the map. \n\nThe hotspot coordinates are automatically recorded when the user clicks within the highlighted barangay boundary.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "Add Confirmation",
            description: "Clicking the “Add Hotspot” button will display a confirmation modal asking the user to confirm the registration of the new hotspot. This ensures that all entered information is reviewed and confirmed before the hotspot is added to the system. \n\nClicking the “Cancel” button will display a confirmation modal asking the user to confirm whether they want to cancel the hotspot registration. This ensures that the user does not accidentally discard the information entered for the new hotspot.",
          },
        ],
      },
      {
        id: "edit-hotspot",
        label: "Edit Canal Hotspot",
        description: "Clicking the three-dot (⋮) menu opens a dropdown with two options: Edit, to modify the hotspot's details, and Remove, to delete the hotspot from the list. \n\nClicking Edit opens a form pre-filled with the hotspot's existing details. Hotspot Information (barangay, name, description), Canal Properties (width, shape, depth, sensor height), and Geographic Location (map pin with latitude/longitude). Allowing the user to update any field. Changes are saved by clicking Save Changes, or discarded by clicking Cancel.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "Changes Confirmation",
            description: "After clicking Save Changes, a Confirm Changes dialog appears asking the user to verify the update. Clicking Confirm Changes finalizes and saves the updates, while clicking Keep Editing returns to the edit form without saving. \n\nClicking Cancel while there are unsaved changes triggers a Cancel Changes confirmation dialog, warning the user that unsaved changes will be lost. Clicking Yes, Cancel discards the changes and closes the form, while clicking Keep Editing returns to the edit form without discarding anything.",
          },
        ],
      },
      {
        id: "remove-hotspot",
        label: "Remove Canal Hotspot",
        description: "Clicking the three-dot (⋮) menu opens a dropdown with two options: Edit, to modify the hotspot's details, and Remove, to delete the hotspot from the list. \n\nClicking Remove opens a confirmation dialog warning that the action cannot be undone. Clicking Remove permanently deletes the hotspot, while clicking Cancel closes the dialog without making any changes.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        
      },
    ],
  },
  {
    id: "node-manage",
    label: "Node Management",
    steps: [
      {
        id: "node-management-overview",
        label: "Node Management Overview",
        description: "This page provides an overview of all IoT sensor nodes registered in the system. It allows users to view the total number of nodes, their availability status, and current occupancy. Users can also search and filter nodes, add new nodes, edit existing node information, and access additional actions for each node.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        
      },
      {
        id: "node-man-summary-cards",
        label: "Summary Cards",
        description: "-",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
      
      },
      {
        id: "search-filter-nodes",
        label: "Search and Filter Nodes",
        description: "Clicking the All Status dropdown reveals filter options such as All Status, Available, Occupied, and Retired, allowing you to narrow the IoT Sensor Nodes table to show only nodes matching the selected availability status. Next to the status filter, the Search node bar lets you quickly find a specific node by typing its name or ID.",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
        extraSections: [
          {
            label: "Filter Status",
            description: "Clicking the All Status dropdown reveals filter options such as All Status, Available, Occupied, and Retired, allowing you to narrow the IoT Sensor Nodes table to show only nodes matching the selected availability status. Next to the status filter, the Search node bar lets you quickly find a specific node by typing its name or ID.",
          },
        ],
      },
      {
        id: "add-node",
        label: "Add Node",
        description: "Clicking Add Node button opens the Add Node modal, allowing the admin to register a new IoT sensor node into the system.",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
        extraSections: [
          {
            label: "Add Node Modal",
            description: "This opens after clicking the Add Node button on the Node Management page, allowing the user to register a new IoT sensor node into the system. The Node Name field is automatically pre-filled with the next available identifier, which the user can adjust before confirming with the Add button.",
          },
          {
            label: "Cancel Adding Confirmation",
            description: "Appears when the user clicks Cancel while the Add Node modal is open, asking for confirmation before discarding the entry. Clicking Keep Editing returns to the form, while Yes, Cancel discards the entry and closes the modal.",
          },
          {
            label: "Confirm Adding Dialog",
            description: "Appears when the user clicks Add Node on the Add Node modal, asking for confirmation before proceeding. Clicking Keep Editing returns to the form, while Add Node confirms and proceeds with registering the new sensor node.",
          },
          {
            label: "Loading Add Confirmation",
            description: "A loading indicator is shown briefly after clicking Add Node confirming that the system is processing and saving the new sensor node's details.",
          },
          {
            label: "Generating Device Key Dialog",
            description: "A loading indicator is shown after the node is added, confirming that the system is creating a secure device key for the new sensor node and emailing it to the admin.",
          },
          {
            label: "Device Key Generated Dialog",
            description: "This confirms that the secure device key for the newly added node has been emailed to the admin's registered email address, to be copied into the device firmware. A warning note reminds the admin that if the key is lost, a new one must be generated and the device reflashed. \n\nClicking Done closes the dialog.",
          },
          {
            label: "Sensor Node Successfully Added",
            description: "This dialog confirms that the new sensor node has been successfully added to the system. Clicking Done closes the dialog and returns the admin to the Node Management page.",
          },
        ],
      },
      {
        id: "iot-sensor-nodes-tbl",
        label: "IoT Sensor Nodes Table",
        description: "This Sensor nodes table lists each node's Node ID, Node Name, current Availability status (Available, Occupied, or Retired), and available Actions (Edit and additional options via the three-dot menu).",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
      },
      {
        id: "edit-node",
        label: "Edit Node",
        description: "Clicking Edit on a node opens the Node Information dialog, pre-filled with the node's current name  and a Generate New Key option to reassign its key.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "Generate New Key",
            description: "Clicking Save Changes triggers a Confirm Changes dialog asking if you want to update the node, while clicking Cancel triggers a Cancel Changes dialog warning that unsaved changes will be lost; in both dialogs.",
          },
           {
            label: "Generate New Key Confirmation",
            description: "Appears when the user clicks Generate New Key in the Edit Node modal, warning that this action will invalidate the node's current device key and require the physical device to be reflashed before it can reconnect. Clicking Cancel discards the action, while Generate Key proceeds with creating a new device key.",
          },
          {
            label: "Device Key Generated Dialog",
            description: "Confirms that a new device key for the node has been emailed to the admin's registered email address, to be copied into the device firmware. A warning note reminds the user that if the key is lost, a new one must be generated and the device reflashed. Clicking Done closes the dialog.",
          },
          {
            label: "Cancel Changes Confirmation Dialog",
            description: "Appears when the user clicks Cancel while the Edit Node modal is open, warning that any unsaved changes will be lost. Clicking Keep Editing returns to the form, while Yes, Cancel discards the changes and closes the modal.",
          },
          {
            label: "Changes Confirmation Dialog",
            description: "Appears when the user clicks Save Changes on the Edit Node modal, asking for confirmation before applying the update. Clicking Keep Editing returns to the form, while Confirm Changes saves the updated node information.",
          },
          {
            label: "Saving Changes Dialog",
            description: "A loading indicator shown after confirming the update, confirming that the system is processing and saving the node's updated information.",
          },
          {
            label: "Success Dialog",
            description: "Confirms that the node's information has been successfully updated. Clicking Done closes the dialog and returns the user to the Node Management page.",
          },
        ],
      },
      {
        id: "additional-node-act",
        label: "Additional Node Actions",
        description: "Clicking the three-dot (⋮) button next to a node opens a menu with three additional actions:",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "View Readings",
            description: "View Readings opens the node's Sensor Readings History, displaying a table with Timestamp, Hotspot Name, Water Level, Flow Rate, Clog %, and Status columns.",
          },
          {
            label: "Unassign",
            description: "Unassign opens a confirmation dialog asking whether to remove the node's current assignment; confirming returns the node to Available status.",
          },
          {
            label: "Decomission",
            description: "Decommission opens a confirmation dialog warning that the node will be marked as Retired and permanently removed from active monitoring.",
          },
        ],
      },
    ],
  },
  {
    id: "node-assign",
    label: "Node Assignment",
    steps: [
      {
        id: "node-assign-overview",
        label: "Node Assignment Overview",
        description: "The Node Assignment page shows a summary of assigned nodes, Total Assigned, Active, and Inactive counts, along with a table of all Assigned Canal Nodes, listing each node's barangay, name, hotspot, location with a View on Map button, status, installation date, and options to Edit or Unassign.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        
      },
      {
        id: "node-assign-summary-cards",
        label: "Managing Hotspots",
        description: "These shows the summary of the Key Performance Indicator cards such as the assigned nodes, Active nodes, and Inactive nodes.",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
      },
      {
        id: "search-filter-nodes",
        label: "Search and Filter Nodes",
        description: "Clicking the All Status dropdown reveals filter options such as All Status, Active, and Inactive allowing you to narrow the Assigned Nodes table to show only nodes matching the selected availability status. Next to the status filter, the Search node bar lets you quickly find a specific node by typing its name, ID, or Barangay.",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
      },
      {
        id: "assign-node",
        label: "Assign Node",
        description: "Clicking Assign Node opens the Assign Node form, where you select a Node, Barangay, and Hotspot, and set the Installed At date.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "Geographic Location",
            description: "Once a hotspot is selected, the Geographic Location section auto-fills the Latitude and Longitude and displays a Map Preview showing the hotspot's location (marked as Available or Occupied).",
          },
          {
            label: "Zoom In | Zoom Out",
            description: "Users can zoom in/out, close the modal, or click “Open in Maps” to view the location in an external maps application.",
          },
          {
            label: "Hotspot Status Legend",
            description: "This indicates whether a canal hotspot location is currently in use: a gray marker means the hotspot is Available (unoccupied by a sensor node), while a green marker means it is Occupied (currently assigned to a sensor node).",
          },
          {
            label: "Cancel Node Assignment Confirmation",
            description: "Appears when the user cancels an in-progress node assignment, asking for confirmation before discarding it. Clicking Keep Editing returns to the assignment process, while Yes, Cancel discards the assignment and closes the dialog.",
          },
          {
            label: "Assign Node Confirmation",
            description: "Clicking Assign Node opens a confirmation modal to verify the new assignment before it is saved.",
          },
        ],
      },
      {
        id: "assigned-canal-node-tbl",
        label: "Assigned Canal Nodes Table",
        description: "This is the list of nodes currently assigned to a hotspot, showing its Node number, Barangay, Node Name, Hotspot, Location , Status, Installed date, and available Actions to Edit or Unassign the node.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "View on Map",
            description: "Clicking View on Map opens a dialog showing the selected node's location pinned on the map, along with its exact latitude and longitude coordinates. \n\nClicking the “Open in Maps” option will redirect you to an external map service, where you can view the sensor node’s exact location and access additional mapping features.",
          },
          {
            label: "Zoom In | Zoom Out",
            description: "Users can zoom in/out, close the modal, or click “Open in Maps” to view the location in an external maps application.",
          },
        ],
      },
      {
        id: "edit-assigned-canal-node",
        label: "Edit Assigned Canal Nodes",
        description: "Clicking Edit opens a form pre-filled with the hotspot's existing details. Node Assignment Information, barangay name, hotspot, and installed at. Allowing the user to update any field.",
        whyItMatters: "Placeholder — explain why viewing hotspots matters.",
        extraSections: [
          {
            label: "Changes Confirmation",
            description: "Changes are saved by clicking Save Changes, or discarded by clicking Cancel.",
          },
        ],
      },
      {
        id: "unassign-node",
        label: "Unassign Node",
        description: "Clicking Unassign on the Node Assignment page opens a confirmation dialog asking if you want to unassign the node. ",
        whyItMatters: "Placeholder — explain why managing hotspots matters.",
      },
    ],
  },
  {
    id: "history",
    label: "History",
    subTopics: [
      {
        id: "clog-events",
        label: "Clog Events",
        steps: [
          {
            id: "clog-events-overview",
            label: "Clog Events Overview",
            description: "Tracks canal obstruction incidents detected by the system, showing summary metrics such as Total Clog Events, Cleared Events, Average Resolution Time, and Monthly Completed Events, along with a searchable and filterable table by Barangay and Severity listing each event's ID, Severity, Detected/Resolved timestamps, Location, Water Level, Water Flow, and Status. ",
            whyItMatters: "Placeholder — explain why clog events matter.",
            
          },
          {
            id: "clog-events-summary-cards",
            label: "Summary Cards",
            description: "-",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            
          },
          {
            id: "search-filter-clog-events",
            label: "Search and Filter Clog Events",
            description: "Users can use the Search clog event bar to quickly find a specific event, or the All Barangay, All Severity(low, medium, high), All Status(detected, cleared), and Date dropdowns to filter results by location and severity, both can be combined to narrow the list further.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            
          },
          {
            id: "clog-events-tbl",
            label: "Clog Events List",
            description: "-",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            extraSections: [
              {
                label: "-",
                description: "",
              },
            ],
          },
          {
            id: "selected-clog-event",
            label: "Selected Clog Event",
            description: "Selecting a record from the table displays its full details in the panel on the right.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            extraSections: [
              {
                label: "-",
                description: "-",
              },
            ],
          },
          {
            id: "export-clog-event",
            label: "Export PDF",
            description: "Clicking Export PDF opens an Export PDF confirmation modal asking the user to verify that they want to export the clog events shown as a PDF.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            extraSections: [
              {
                label: "Export PDF Confirmation",
                description: "Clicking Export in the modal proceeds with generating and downloading the PDF, while clicking Cancel closes the modal without exporting.",
              },
            ],
          },
        ],
      },
      {
        id: "waste-classification",
        label: "Waste Classification",
        steps: [
          {
            id: "waste-classification-overview",
            label: "Waste Classification Overview",
            description: "This displays the record of waste detected in canal hotspots, showing summary metrics such Total Classifications, Biodegradable, Recyclable, and Residual/Others, along with a table listing each classification's ID, Dominant Waste Type, Timestamp, Node, Location, Reading ID, and Confidence level. You can use the Search waste classification bar or the All Barangay, All Waste, and All Nodes dropdowns (individually or combined) to filter results. Selecting a record displays its full details in the panel on the right, and the Export PDF button lets you download the classification log.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            
          },
          {
            id: "waste-class-summary-cards",
            label: "Summary Cards",
            description: "-",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            
          },
          {
            id: "search-filter-waste-class",
            label: "Search and Filter Waste",
            description: "User can use the Search waste classification bar or the All Barangay, All Waste, and All Nodes dropdowns (individually or combined) to filter results.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            
          },
          {
            id: "waste-class-tbl",
            label: "Waste Classification List",
            description: "-",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            extraSections: [
              {
                label: "-",
                description: "-",
              },
            ],
          },
          {
            id: "selected-waste",
            label: "Selected Waste",
            description: " Selecting a record displays its full details in the panel on the right.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            extraSections: [
              {
                label: "-",
                description: "-",
              },
            ],
          },
          {
            id: "export-waste",
            label: "Export PDF",
            description: "Export PDF button lets the user download the classification log.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            extraSections: [
              {
                label: "-",
                description: "-",
              },
            ],
          },
        ],
      },
      {
        id: "brgy-monthly-reports",
        label: "Barangay Monthly Reports",
        steps: [
          {
            id: "brgy-monthly-reports-overview",
            label: "Barangay Monthly Reports Overview",
            description: "This is the guide on how to view barangay monthly reports.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            
          },
          {
            id: "brgy-monthly-reports-summary-cards",
            label: "Summary Cards",
            description: "These cards show quick-glance totals for the selected period, including the total number of barangay reports submitted and the total recyclable, biodegradable, and residual/other waste collected in kilograms.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            
          },
          {
            id: "progress-bar",
            label: "Progress Bar",
            description: "This section displays a progress bar showing how many reports have been verified versus not submitted for the selected month, along with the overall completion percentage.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            
          },
          {
            id: "reporting-period",
            label: "Reporting Period",
            description: "This panel shows the date range covered by the current reporting period.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            
          },
          {
            id: "search-filter-brgy-monthly-report",
            label: "Search and Filter Monthly Report",
            description: "The search bar lets users look up specific reports, while the barangay and month/year dropdown filters narrow the report list by location and reporting period.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            
          },
          {
            id: "reports-tbl",
            label: "Barangay Monthly Report Table",
            description: "This table lists individual barangay report submissions, showing the date submitted, the barangay, who submitted it, its current status, and available actions.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            extraSections: [
              {
                label: "-",
                description: "-",
              },
            ],
          },
        ],
      },
      {
        id: "municipal-reports",
        label: "Municipal Reports",
        steps: [
          {
            id: "municipal-reports-overview",
            label: "Municipal Reports Overview",
            description: "The Municipal Reports page provides a consolidated view of waste management reports compiled at the municipal level, allowing users to search, filter by month, and review or export verified reports.",
            whyItMatters: "Placeholder — explain why compiled reports matter.",
            
          },
          {
            id: "municipal-report-summary-card",
            label: "Summary Card",
            description: "These cards show quick-glance totals across all compiled reports, including the total number of municipal reports, and the total recyclable, biodegradable, and residual/other waste collected in kilograms.",
            whyItMatters: "Placeholder — explain why compiled reports matter.",
            
          },
          {
            id: "search-filter-municipal-report",
            label: "Search and Filter Municipal Report",
            description: "The search bar lets users look up specific reports using ID and Name, while the month dropdown filter narrows the list to reports from a selected month.",
            whyItMatters: "Placeholder — explain why compiled reports matter.",
            
          },
          {
            id: "municipal-report-tbl",
            label: "Municipal Report Table",
            description: "This table lists individual municipal reports, showing the report ID, the date (month/year) it covers, who verified it.",
            whyItMatters: "Placeholder — explain why compiled reports matter.",
            extraSections: [
              {
                label: "View Report",
                description: "Clicking View on a report opens the full Municipal Report page for the selected month. This report displays a detailed table breaking down waste data per barangay—covering Recyclables (Bote, Bakal, Papel, Plastic, Karton), Amount Sold, Biodegradable Waste, Residual Waste, and Special Waste. Users can click the back arrow to return to the Municipal Reports list, or click Export PDF to download the report.",
              },
            ],
          },
          {
            id: "export-municipal-report",
            label: "Export PDF",
            description: "Clicking Export PDF will trigger a confirmation modal, asking the user to verify that they want to export the compiled MRF report for the selected month.",
            whyItMatters: "Placeholder — explain why compiled reports matter.",
            extraSections: [
              {
                label: "Export Confirmation",
                description: "Clicking Export in the modal proceeds with generating and downloading the PDF, while clicking Cancel closes the modal without exporting.",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    subTopics: [
      {
        id: "user-management",
        label: "User Management",
        steps: [
          {
            id: "user-management-overview",
            label: "User Management Overview",
            description: "The User Management page allows administrators to view, search, filter, and manage all system user accounts, including adding new users and editing or deactivating existing ones.",
            whyItMatters: "Placeholder — explain why user management matters.",
            
          },
          {
            id: "summary-card-user-man",
            label: "Summary Cards",
            description: "-",
            whyItMatters: "Placeholder — explain why user management matters.",
            
          },
          {
            id: "search-filter-user",
            label: "Search and Filter User",
            description: "The search bar lets users look up specific accounts by name or email, while the All Users (Menro Staff, Menro Officer, Barangay) and All Status (Active, Inactive) dropdown filters narrow the list by user type/role and account status.",
            whyItMatters: "Placeholder — explain why user management matters.",
            
          },
          {
            id: "add-user",
            label: "Add User",
            description: "Clicking the Add User button opens the Add User Account page for entering the new user's details. On the left, a preview card displays placeholders for the user's picture, name, status, role, and email, while the form on the right asks for the user's first and last name, their role, barangay, and position, and the email address they will use to log in. Once all the required fields are completed",
            whyItMatters: "Placeholder — explain why user management matters.",
            extraSections: [
              {
                label: "-",
                description: "When the Admin/Menro Staff/ Menro Officer role is selected from the Role dropdown, the Barangay and Position fields are hidden, since these do not apply to the Admin/Menro Staff/ Menro Officer role. Only the Role field remains in the Role & Assignment section, allowing the user to proceed directly with filling out the Personal Information and Account Credentials sections before creating the account.",
              },
              {
                label: "Add User Confirmation",
                description: "If the role being created is Admin, a Replace Current Admin? warning modal appears, informing the user that creating a new Admin account will deactivate the current active Admin and log them out immediately. Clicking Yes, Proceed confirms the replacement and creates the new Admin account, while clicking Cancel stops the action and keeps the current Admin active. \n\nIf the role being created is MENRO Staff, MENRO Officer, or Barangay Official, a Confirm Adding User modal appears instead, simply asking the user to confirm the new account. Clicking Add User proceeds with creating the account, while clicking Keep Editing returns to the form without saving.",
              },
            ],
          },
          {
            id: "edit-user",
            label: "Edit User",
            description: "Clicking Edit on a user account opens the Edit User Account page, pre-filled with the selected user's existing details. On the left, a preview card displays the user's initials, name, role, status, email, and assigned barangay, while the form on the right allows the user to update the Personal Information (first and last name), Role & Assignment (role, barangay, and position), and Account Credentials (email). Clicking Save Changes updates the account, clicking Cancel discards the edits, and clicking Back returns to the User Management page.",
            whyItMatters: "Placeholder — explain why user management matters.",
            extraSections: [
              {
                label: "Save Changes Confirmation",
                description: "Clicking Save Changes opens a Confirm Changes modal, asking the user to verify that they want to update the selected user's information. Clicking Confirm Changes finalizes and saves the updates, while clicking Keep Editing returns to the edit form without saving.",
              },
              {
                label: "Cancel Changes Confirmation",
                description: "Clicking Cancel while there are unsaved changes triggers a Cancel Changes modal, warning the user that unsaved changes will be lost. Clicking Yes, Cancel discards the changes and closes the form, while clicking Keep Editing returns to the edit form without discarding anything.",
              },
            ],
          },
          {
            id: "deactivate-user",
            label: "Deactivate User",
            description: "Clicking Deactivate opens a Deactivate User confirmation modal, asking the user to verify that they want to deactivate the selected account. Clicking Deactivate User proceeds with disabling the account, while clicking Cancel closes the modal without making any changes.",
            whyItMatters: "Placeholder — explain why user management matters.",
            
          },
        ],
      },
      {
        id: "brgy-management",
        label: "Barangay Management",
        steps: [
          {
            id: "brgy-management-overview",
            label: "Barangay Management Overview",
            description: "The Barangay Management page allows users to view, search, filter, and manage the registration status of all barangays covered by the system.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            
          },
          {
            id: "brgy-management-summary-card",
            label: "Summary Card",
            description: "These cards show quick-glance totals, including the Total Barangay count, All Registered barangays, and All Unregistered barangays.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            
          },
          {
            id: "search-filter-brgy",
            label: "Search and Filter Barangay",
            description: "The search bar lets users look up a specific barangay by name, while the All Barangay dropdown filter narrows the list by registration status.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            
          },
          {
            id: "registered-brgy-tbl",
            label: "Registered Barangay List",
            description: "-",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            extraSections: [
              {
                label: "View on Map",
                description: "Clicking  “View on map” opens a modal displaying the hotspot's exact location on an interactive map, along with its coordinates and a status legend (Available/Occupied). ",
              },
              {
                label: "Zoom In | Zoom Out & Open in Maps",
                description: "Users can zoom in/out, close the modal, or click “Open in Maps” to view the location in an external maps application.",
              },
            ],
          },
          {
            id: "register-brgy",
            label: "Register Barangay",
            description: "Clicking Register on an unregistered barangay opens a Register Barangay confirmation modal, asking the user to verify the action and noting that registering the barangay will allow sensor nodes to be deployed within its jurisdiction. Clicking Register proceeds with registering the barangay, while clicking Cancel closes the modal without making any changes.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            
          },
          {
            id: "unregister-active-brgy",
            label: "Unregister Barangay",
            description: "Clicking Register on an unregistered barangay opens a Register Barangay confirmation modal, asking the user to verify the action and noting that registering the barangay will allow sensor nodes to be deployed within its jurisdiction. Clicking Register proceeds with registering the barangay, while clicking Cancel closes the modal without making any changes.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            extraSections: [
              {
                label: "",
                description: "Clicking Unregister on a barangay with no active canal hotspots opens an Unregister Barangay confirmation modal, asking the user to verify the action and reminding them to ensure all sensor nodes and barangay users are unassigned first. Clicking Unregister proceeds with removing the barangay's registration, while clicking Cancel closes the modal without making any changes.",
              },
            ],
          },
        ],
      },
      {
        id: "iot-health",
        label: "IoT Health",
        steps: [
          {
            id: "iot-health-overview",
            label: "IoT Health Overview",
            description: "This page monitors the hardware status of deployed nodes, showing summary metrics such as Online Nodes, Average Battery, Average Signal, and Sensor count, along with the Canal Network Map, which plots each node's location and live risk level (Sleep Mode, Normal, Warning, or Critical). ",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            
          },
          {
            id: "iot-summary-cards",
            label: "Summary Cards",
            description: "-",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            
          },
          {
            id: "iot-map",
            label: "Canal Network Map",
            description: "-",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            extraSections: [
              {
                label: "Live Risk Level Legend",
                description: "-",
              },
              {
                label: "Zoom In | Zoom Out",
                description: "-",
              },
            ],
          },
          {
            id: "selected-node",
            label: "Selected Node",
            description: "Selecting a node from the map reveals the full information to the right panel with its hardware status and sensor information,  and updates the Battery Voltage, 4G Signal, and Sensor cards below with the node's detailed readings.",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            extraSections: [
              {
                label: "Hardware Status & Information",
                description: "-",
              },
              {
                label: "Bottom Cards ?",
                description: "-",
              },
            ],
          },
        ],
      },
      {
        id: "dev-maintenance",
        label: "Maintenance",
        steps: [
          
          {
            id: "maintenance-overview",
            label: "Maintenance Overview",
            description: "-",
            whyItMatters: "-",
            extraSections: [
              {
                label: "-",
                description: "-",
              },
            ],
          },
          
        ],
      },
      {
        id: "system-audit-logs",
        label: "System Audit Logs",
        steps: [
          {
            id: "system-audit-logs-overview",
            label: "System Audit Logs Overview",
            description: "The System Audit Logs page provides a chronological record of all user activities performed within the system, allowing administrators to search, filter, review, and export logs for monitoring and accountability purposes.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
          
          },
          {
            id: "search-filter-audit-logs",
            label: "Search and Filter",
            description: "The search bar lets users look up specific log entries.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
          
          },
          {
            id: "export-audit-logs",
            label: "Export PDF",
            description: "Clicking Export PDF opens an Export PDF confirmation modal, asking the user to verify that they want to export the audit logs shown as a PDF. Clicking Export proceeds with generating and downloading the PDF, while clicking Cancel closes the modal without exporting.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
            extraSections: [
              {
                label: "Exported PDF File",
                description: "-",
              },
            ],
          },
          {
            id: "audit-logs-acts-tbl",
            label: "Audit Logs and Acitivities",
            description: "-",
            whyItMatters: "Placeholder — explain why audit logs matter.",
            extraSections: [
              {
                label: "Page Number",
                description: "Located at the bottom left of the table, indicates the current page number the user is viewing out of the total number of available pages.",
              },
              {
                label: "Previous | Next Button",
                description: "The Next and Previous button, located at the bottom right of the table, allows the user to move forward to the next page or to go back to the previous page of records when there are multiple pages of data. It becomes disabled (grayed out) once the user reaches the last page, indicating there are no more records to display. ",
              },
            ],
          },
        ],
      },
      {
        id: "settings",
        label: "Settings",
        steps: [
          {
            id: "settings-overview",
            label: "Settings Overview",
            description: "The Settings page allows administrators to configure system-wide preferences, including alert sounds and data backup, restore options restore points, and recent backup history.",
            whyItMatters: "Placeholder — explain why settings matter.",
          },
          {
            id: "alert-sound",
            label: "Alert Sound",
            description: "This section lets users manage notification sounds for the system. The Enable alert sounds toggle turns notification sounds on or off. ",
            whyItMatters: "Placeholder — explain why settings matter.",
            extraSections: [
              {
                label: "Select Sound",
                description: "Users can select a sound for each alert level such as Critical, Warning, and Info from a dropdown, click Preview to listen to the selected sound, or click the trash icon to delete a custom sound. ",
              },
              {
                label: "Upload Custom Sound",
                description: "The Upload Custom Sound button allows users to add their own sound file.",
              },
              {
                label: "Save Settings Confirmation",
                description: "Clicking Save Settings applies and saves any changes made in this section.",
              },
            ],
          },
          {
            id: "backup-setting",
            label: "Backup",
            description: "This section lets users manage notification sounds for the system. The Enable alert sounds toggle turns notification sounds on or off. ",
            whyItMatters: "Placeholder — explain why settings matter.",
            extraSections: [
              {
                label: "Manual Backup",
                description: "Manual Backup lets users create an on-demand backup of the database, media, and AI models by clicking Backup Now, with the last backup date and time shown below. \n\nClicking Backup Now opens a Create Backup confirmation modal, informing the user that this will create a full backup of the database, media, and AI models, and allow them to choose where to save it. Clicking Backup Now in the modal proceeds with creating the backup, while clicking Cancel closes the modal without making any changes.",
              },
              {
                label: "Scheduled Backup",
                description: "Clicking the Frequency dropdown displays the available backup schedule options such as Daily, Weekly, and Monthly. Allowing the user to choose how often automatic backups should run. \n\nClicking Save Settings afterward opens a confirmation modal, informing the user that this will update their automatic backup schedule settings. Clicking Save Settings in the modal confirms and applies the changes, while clicking Cancel closes the modal without saving.",
              },
              {
                label: "Save Settings Confirmation",
                description: "Clicking Save Settings applies and saves any changes made in this section.",
              },
            ],
          },
          {
            id: "restore-setting",
            label: "Restore",
            description: "The Restore section allows users to restore the system using a previously saved backup file. Clicking Choose Backup File opens the device's file explorer, allowing the user to select a backup file to upload, with a warning noting that restoring will overwrite the current system data with the contents of the selected backup.",
            whyItMatters: "Placeholder — explain why settings matter.",
            extraSections: [
              {
                label: "Choose Backup File",
                description: "Users can select a sound for each alert level such as Critical, Warning, and Info from a dropdown, click Preview to listen to the selected sound, or click the trash icon to delete a custom sound. ",
              },
              {
                label: "Selected Backup File",
                description: "Once a backup file is selected, its file name is displayed beside the Choose Backup File button, along with a Restore button to proceed.",
              },
              {
                label: "Restore Confirmation",
                description: "Clicking Restore opens a Restore System confirmation modal, warning the user that this action will overwrite the current database, media files, and AI models with the contents of the selected backup, that it cannot be undone, and that they will be automatically logged out and need to sign in again once it completes. \n\nClicking Restore in the modal proceeds with restoring the system, while clicking Cancel closes the modal without making any changes.",
              },
            ],
          },
          {
            id: "restore-points",
            label: "Restore Points",
            description: "The Restore Points section lists backup snapshots available on the server, sourced from both scheduled and manual backups, with each entry showing the backup file name, date and time created, and file size. ",
            whyItMatters: "Placeholder — explain why settings matter.",
            extraSections: [
              {
                label: "Restore Confirmation",
                description: "Clicking Restore beside a specific snapshot opens a confirmation modal, warning the user that this action will overwrite the current database, media files, and AI models with the contents of the selected backup, that it cannot be undone, and that they will be automatically logged out and need to sign in again once it completes. Clicking Restore in the modal proceeds with restoring the system, while clicking Cancel.",
              },
            ],
          },
          {
            id: "recent-backup-act",
            label: "Recent Backup Activity",
            description: "The Recent Backup Activity table logs a history of all backup and restore actions performed in the system, showing the Type (Manual, Restore, or Scheduled), Status, the user who performed it, the File name, and the Date and time it occurred. ",
            whyItMatters: "Placeholder — explain why settings matter.",
            extraSections: [
              {
                label: "Prevous | Next Pages",
                description: "Users can navigate through multiple pages of records using the Previous and Next buttons, with the current page indicated at the bottom left ",
              },
            ]
          },
        ],
      },
    ],
  },
]

const SEEN_INTRO_KEY = "agos-manual-intro-seen"

function firstSteps(topic: ManualTopic): { subTopicId: string | null; steps: ManualStep[] } {
  if (topic.subTopics && topic.subTopics.length > 0) {
    return { subTopicId: topic.subTopics[0].id, steps: topic.subTopics[0].steps }
  }
  return { subTopicId: null, steps: topic.steps ?? [] }
}

function getSteps(topic: ManualTopic, subTopicId: string | null): ManualStep[] {
  if (topic.subTopics && topic.subTopics.length > 0) {
    const sub = topic.subTopics.find((s) => s.id === subTopicId) ?? topic.subTopics[0]
    return sub.steps
  }
  return topic.steps ?? []
}

function visitKey(topicId: string, subTopicId: string | null) {
  return subTopicId ? `${topicId}:${subTopicId}` : topicId
}

export default function UserManual() {
  const [showIntro, setShowIntro] = useState(false)
  const [checkedStorage, setCheckedStorage] = useState(false)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")

  const initial = firstSteps(TOPICS[0])
  const [activeTopicId, setActiveTopicId] = useState(TOPICS[0].id)
  const [activeSubTopicId, setActiveSubTopicId] = useState<string | null>(initial.subTopicId)
  const [activeStepId, setActiveStepId] = useState(initial.steps[0].id)

  // Tracks which step ids have been viewed, keyed by "topicId" or "topicId:subTopicId"
  const [visitedByKey, setVisitedByKey] = useState<Record<string, string[]>>({
    [visitKey(TOPICS[0].id, initial.subTopicId)]: [initial.steps[0].id],
  })

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_INTRO_KEY)
    setShowIntro(!seen)
    setCheckedStorage(true)
  }, [])

  const dismissIntro = () => {
    localStorage.setItem(SEEN_INTRO_KEY, "true")
    setShowIntro(false)
  }

  const activeTopic = TOPICS.find((t) => t.id === activeTopicId)!
  const activeSubTopic = activeTopic.subTopics
    ? activeTopic.subTopics.find((s) => s.id === activeSubTopicId) ?? activeTopic.subTopics[0]
    : null
  const activeSteps = getSteps(activeTopic, activeSubTopicId)
  const activeStepIndex = activeSteps.findIndex((s) => s.id === activeStepId)
  const activeStep = activeSteps[activeStepIndex]
  const currentVisitKey = visitKey(activeTopicId, activeSubTopic ? activeSubTopic.id : null)
  const visitedStepIds = visitedByKey[currentVisitKey] ?? []

  const query = search.trim().toLowerCase()

  const filteredTopics: ManualTopic[] = !query
    ? TOPICS
    : TOPICS.reduce<ManualTopic[]>((acc, topic) => {
        const topicMatches = topic.label.toLowerCase().includes(query)

        if (topic.subTopics) {
          if (topicMatches) {
            acc.push(topic)
            return acc
          }
          const matchingSubTopics = topic.subTopics.filter((s) =>
            s.label.toLowerCase().includes(query)
          )
          if (matchingSubTopics.length > 0) {
            acc.push({ ...topic, subTopics: matchingSubTopics })
          }
          return acc
        }

        if (topicMatches) acc.push(topic)
        return acc
      }, [])

  const markVisited = (key: string, stepId: string) => {
    setVisitedByKey((prev) => {
      const current = prev[key] ?? []
      if (current.includes(stepId)) return prev
      return { ...prev, [key]: [...current, stepId] }
    })
  }

  const goToStepId = (topicId: string, subTopicId: string | null, stepId: string) => {
    setActiveTopicId(topicId)
    setActiveSubTopicId(subTopicId)
    setActiveStepId(stepId)
    markVisited(visitKey(topicId, subTopicId), stepId)
  }

  // Plain tab click (Dashboard, Monitoring, ... — no dropdown)
  const selectTopic = (topicId: string) => {
    const topic = TOPICS.find((t) => t.id === topicId)
    if (!topic) return
    const { subTopicId, steps } = firstSteps(topic)
    goToStepId(topicId, subTopicId, steps[0].id)
  }

  // Dropdown item click (e.g. "Clog Events" under History)
  const selectSubTopic = (topicId: string, subTopicId: string) => {
    const topic = TOPICS.find((t) => t.id === topicId)
    const sub = topic?.subTopics?.find((s) => s.id === subTopicId)
    if (!sub) return
    goToStepId(topicId, subTopicId, sub.steps[0].id)
  }

  const selectStep = (stepId: string) => {
    goToStepId(activeTopicId, activeSubTopic ? activeSubTopic.id : null, stepId)
  }

  const goToStep = (offset: number) => {
    const nextIndex = activeStepIndex + offset
    if (nextIndex >= 0 && nextIndex < activeSteps.length) {
      goToStepId(activeTopicId, activeSubTopic ? activeSubTopic.id : null, activeSteps[nextIndex].id)
    }
  }

  if (!checkedStorage) return null

  if (showIntro) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <IntroScreen onGetStarted={dismissIntro} />
      </div>
    )
  }

  const sidebarTitle = activeSubTopic ? activeSubTopic.label : activeTopic.label

  return (
    <div className="max-w-20xl mx-auto py-1 px-1">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <ManualIntro />
        <SearchBar
          value={search}
          onChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={TOPICS.map((t) => t.label)}
        />
        <TopicTabs
          topics={filteredTopics}
          activeTopicId={activeTopicId}
          activeSubTopicId={activeSubTopic ? activeSubTopic.id : null}
          onSelectTopic={selectTopic}
          onSelectSubTopic={selectSubTopic}
          searchActive={!!query}
        />

        <div className="flex h-[calc(100vh-220px)]">
          <div className="overflow-y-auto">
            <StepsList
            title={sidebarTitle}
            description={`Below is the guide on how to use the ${sidebarTitle}.`}
            steps={activeSteps}
            activeStepId={activeStepId}
            visitedStepIds={visitedStepIds}
            onSelect={selectStep}
          />
          </div>
          <div className="flex-1 overflow-y-auto">
            <StepDetail
            stepIndex={activeStepIndex}
            totalSteps={activeSteps.length}
            title={activeStep.label}
            description={activeStep.description}
            whyItMatters={activeStep.whyItMatters}
            images={activeStep.images}  
            extraSections={activeStep.extraSections}
            onPrevious={() => goToStep(-1)}
            onNext={() => goToStep(1)}
            hasPrevious={activeStepIndex > 0}
            hasNext={activeStepIndex < activeSteps.length - 1}
          />
          </div>
          
        </div>
      </div>
    </div>
  )
}
