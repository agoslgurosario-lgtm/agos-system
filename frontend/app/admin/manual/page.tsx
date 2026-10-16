"use client"

import { useEffect, useState } from "react"
import IntroScreen from "./components/IntroScreen"
import ManualIntro from "./components/ManualIntro"
import SearchBar from "./components/SearchBar"
import TopicTabs from "./components/TopicTabs"
import StepsList, { ManualStep } from "./components/StepList"
import StepDetail from "./components/StepDetails"
import GuidedTour, { TourStep } from "./components/GuidedTour"

const SEEN_TOUR_KEY = "agos-manual-tour-seen"

const TOUR_STEPS: TourStep[] = [
  { target: "search", title: "Search the manual", description: "Type a word or phrase to find it anywhere in the manual.", placement: "bottom" },
  { target: "topics", title: "Topics", description: "Switch between sections of the system here. Some tabs open a dropdown of sub-topics.", placement: "bottom" },
  { target: "steps", title: "Steps", description: "Each topic is broken into steps. Visited steps are marked as you go.", placement: "right" },
  { target: "detail", title: "Step details", description: "The full instructions, images, and the reason each step matters appear here.", placement: "left" },
  { target: "nav", title: "Previous and Next", description: "Move through the manual one step at a time.", placement: "bottom" },
]




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
        whyItMatters: "This is important because it is the first step of the guided tutorial, and it introduces new administrators to the login page before they use it. Knowing where to enter their email and password, and where to find “Forgot Password?”, helps them access the AGOS dashboard confidently and recover their account on their own if needed.",
        images: ["/admin-manual/login/login-overview.png"],
      },
      {
        id: "login-cont",
        label: "Login User Credentials",
        description: "The login form consists of two fields: the Email field, where the admin enters their registered email address, and the Password field, where the admin enters their account password.",
        whyItMatters: "These login features help the administrator access the system securely. The Email and Password fields verify that only authorized users can enter, the hide/unhide option helps prevent typing errors while keeping the password private, the error message alerts the administrator to incorrect credentials, and the Login button submits the details before the Data Privacy Notice and dashboard access.",
        images: ["/admin-manual/login/login-usercredentials.png"], 
        extraSections: [
          {
            label: "Hide | Unhide password",
            description: " The password field includes an eye icon that toggles visibility, allowing the admin to show or hide the entered characters before logging in.",
            images: ["/admin-manual/login/login-overview.png"],
          },
          {
            label: "Incorrect Email | Password",
            description: "If the administrator enters an incorrect email or password, both fields turn red and the message “Email or password is incorrect. Check your credentials and try again.” appears.",
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
        whyItMatters: "The Data Privacy Notice is important because it makes sure administrators know how their personal data is collected and used, and what their rights are as data subjects under the Data Privacy Act. Requiring the consent box to be checked before clicking “Proceed” gives the system a record that the administrator read and agreed to the notice, which helps the LGU stay compliant with data privacy law.",
        images: ["/admin-manual/login/login-overview.png"],
      },
      {
        id: "change-pword",
        label: "Change Password",
        description: "After clicking “Proceed” in the Data Privacy Notice, this is modal is shown, requiring them to set a new password before proceeding into the system. \n\nThe admin enters their current (temporary) password, then a new password and its confirmation, each with a visibility toggle.",
        whyItMatters: "Setting a new password is important because the temporary password is known to someone other than the administrator. Requiring a change ensures that only the administrator knows the credentials. The real-time checklist helps create a strong password, and the confirmation message and “Go to Login” button show that the change was saved and guide the administrator to sign in with the new password.",
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
            description: "This is a confirmation that the password has been successfully updated and prompts the user to log in again using their new credentials. \n\n Clicking “Go to Login” returns the user to the Login page and enter their email and new password.",
            images: ["/admin-manual/login/login-overview.png"],
          },
        ],
      },
      {
        id: "login-forgot-pass",
        label: "Forgot Password",
        description: "Clicking the “Forgot Password?” link on the Login page starts the account recovery process, which lets the admin verify their identity and reset their password.",
        whyItMatters: "This step allows administrators who have forgotten their password to regain access to their account without needing to contact support, while keeping the account secure.",
        extraSections: [
          {
            label: "Enter Email",
            description: "The admin enters their registered email address and submits it. A verification code is then sent to that email.",
          },
          {
            label: "Enter Verification Code",
            description: "The admin enters the code sent to the email they provided. Once the code is verified, they can proceed to set a new password.",
          },
        ],
      },
      
    ],
  },{
    id: "sidebar",
    label: "Sidebar Navigation",
    steps: [
      {
        id: "sidebar-overview",
        label: "Sidebar Navigation Overview",
        description: "The main navigation panel present throughout the AGOS web dashboard, providing quick access to all primary modules: Dashboard, Monitoring, Alerts, Canal Hotspots, Node Management, Node Assignment, History, and Utilities. It also displays the currently logged-in admin's name and role at the bottom, along with a logout button.",
        whyItMatters: "The sidebar navigation is important because it gives the administrator quick, consistent access to all main modules of AGOS from any page, which saves time and makes the system easier to use. It also shows the logged-in administrator’s name and role, and provides a logout button so the session can be ended securely.",
      },
      {
        id: "sidebar-usage",
        label: "Sidebar Items",
        description: "Click any menu item in the sidebar to navigate to that module's page; the active page is highlighted to show your current location.",
        whyItMatters: "The sidebar items are important because they let the administrator move between modules with a single click, while the highlighted active page shows the current location in the system. The dropdown menus, such as those for History and Utilities, group related pages together, which keeps the sidebar organized and easy to navigate.",
        extraSections: [
          {
            label: "Dropdown",
            description: "For items with a dropdown arrow (such as History and Utilities), click the item to expand its submenu and reveal additional related pages, then click again to collapse it.",
          },
        ],
      },
      {
        id: "user-profile",
        label: "User Panel",
        description: "Displays the name and role (e.g., “Administrator”) of the currently logged-in user at the bottom of the sidebar, along with a logout icon for ending the session.",
        whyItMatters: "The user panel is important because it shows which account is currently signed in and its role, so the administrator can confirm they are using the correct account. The logout icon also lets the administrator end the session securely, especially when using a shared or public device.",

      },
    ],
  },
  {
   id: "top-bar" ,
   label: "Top Bar",
   steps:[
    {
      id:"top-bar-overview",
      label:"Top Bar Overview",
      description: "Displayed across the top of every page, it shows the title of the current module (e.g., “Dashboard”) on the left and the notification bell on the right.",
      whyItMatters: "The top bar is important because it shows the title of the current module, so the administrator always knows which page they are on. The notification bell on the right gives quick access to alerts and updates from any page, helping the administrator notice and respond to important events without leaving their current task.",
    },
    {
      id: "tab-bar-title",
      label: "Module Title",
      description: "Displayed on the left side of the top header bar, it shows the name of the module the admin is currently viewing (e.g., “Dashboard”), helping them confirm their location within the system.",
      whyItMatters: "The module title is important because it clearly shows which page the administrator is currently viewing. This helps them confirm their location in the system, avoid confusion when switching between modules, and ensure they are working in the right section before taking any action.",
    },
    {
      id:"notif-bell",
      label:"Notification Bell",
      description: "Located on the right side of the top header bar, it alerts the admin to new sensor readings and reports submitted by barangay personnel. A red badge shows the number of unread notifications. \n\nClicking the bell opens a dropdown of recent notifications.",
      whyItMatters: "The notification bell is important because it keeps the administrator informed of new sensor readings and barangay reports without leaving their current page. The red badge shows how many notifications are unread, “Mark all as read” clears the badge once everything has been reviewed, and dimmed read notifications make it easy to tell which ones still need attention. The “See all alerts” link leads to the Alerts module for full details, while the “You’re all caught up” message confirms that there is nothing pending, helping the administrator respond to canal issues quickly.",
      extraSections: [
        {
          label: "Mark all as read",
          description:"Located at the top right of the Notifications dropdown; clicking it marks all notifications as read and clears the unread count badge on the notification bell.",
        },
        {
          label: "Read Notification",
          description:"Notifications that have already been read appear dimmed in the list, allowing the admin to easily distinguish them from unread notifications, which are displayed in full color.",
        },
        {
          label: "See all alerts",
          description:"Located at the bottom of the Notifications dropdown; Clicking “See all alerts” navigates the admin to the Alerts module for a full, detailed view.",
        },
        {
          label: "“You’re all caught up” Message",
          description: "Displayed in the Notifications dropdown when there are no new notifications, indicating the admin has no pending alerts or reports to review.",
        },
        
      ]
    },
    {
      id: "notif-bell-report",
      label: "Report Submitted modal",
      description: "Opens when a report notification is clicked from the Notifications dropdown, showing a summary of the barangay-submitted report, including the barangay name, date and time detected, purok, and severity level. \n\nClicking close button (×) dismisses the modal.",
      whyItMatters: "The Report Submitted modal is important because it gives the administrator a quick summary of a barangay-submitted report, including the barangay, the date and time detected, the purok, and the severity level, without leaving the current page. This helps the administrator judge how urgent the report is right away. The View Report button then leads to the Barangay Reports tab for the full details, while the close button (×) lets the administrator dismiss the modal and continue working.",
      extraSections: [
        {
          label: "View Report Button",
          description:"Located at the bottom of the Report Submitted modal; clicking it navigates the admin to the Barangay Reports tab, where the full report is opened for detailed review.",
        },
      ]
    },
    {
      id: "notif-bell-sensor",
      label: "Sensor Notification",
      description: "Opens when a sensor reading alert is clicked from the Notifications dropdown, showing the alert type, the node ID, barangay, and date and time detected. The details section displays the dominant waste type, estimated volume, and confidence score, along with the composition breakdown of recyclable, biodegradable, residual, and special waste. \n\nClicking the close button (×) dismisses the modal.",
      whyItMatters: "The Sensor Notification modal is important because it gives the administrator a quick overview of a sensor alert without leaving the current page. It shows which node and barangay detected the issue and when, along with the dominant waste type, estimated volume, confidence score, and waste composition breakdown. This helps the administrator judge how serious the obstruction is and decide whether action is needed, while the close button (×) lets them dismiss the modal and continue working.",
    },
   ]
   
  },
  {
    id: "dashboard",
    label: "Dashboard",
    steps: [
      {
        id: "dashboard-overview",
        label: "Overview of Dashboard",
        description: "The Dashboard provides a centralized overview of the canal monitoring system, displaying system summary using key performance Indicator cards,  the canal network map, live waste classification, live alerts, and reporting progress. It also includes the Sensor Node Health Summary, allowing users to monitor the overall battery voltage, 4G signal strength, and sensor continuity of active nodes.",
        whyItMatters: "The Dashboard is important because it gives the administrator a single, centralized view of the entire canal monitoring system. The key performance indicator cards, canal network map, live waste classification, live alerts, and reporting progress show the current situation at a glance, while the Sensor Node Health Summary lets the administrator check the battery voltage, 4G signal strength, and sensor continuity of active nodes. This helps the administrator spot problems early and respond quickly without having to open each module separately.",
      },
      {
        id: "dashboard-summary-cards",
        label: "Summary Cards",
        description: "These Key Performance Indicator cards show a summary of metrics such as sensor node count, critical logs, registered barangays, and resolved cases for the month.",
        whyItMatters: "The summary cards are important because they give the administrator a quick snapshot of the system’s key figures without opening each module. The Assigned Sensor Node card shows which nodes are deployed to which barangays, the Critical Clogs card highlights incidents that need immediate attention, the Registered Barangay card confirms which barangays are covered by the system, and the Resolved This Month card shows how many clogs the barangays have successfully addressed. Each card opens a detailed view that can be closed easily, and the empty-state messages make it clear when there is nothing to show.",
        extraSections: [
          {
            label: "Assigned Sensor Node Card",
            description: "When clicked, it displays the sensor nodes currently assigned to specific barangays.And clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen. \n\n“No assigned sensor nodes” will show if there are no assigned sensor nodes. ",
          },
          {
            label: "Critical Clogs Card",
            description: "When clicked, it displays the number an details of canal clogging incidents that require immediate attention. And clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen. \n\n“No critical clogs” will show if there are no critical clogs.",
          },
          {
            label: "Registered Barangay Card",
            description: "When clicked, it displays the total number and list of barangays registered in the system. And clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen. \n\n“No registered barangays” will show if there are no registered barangays.",
          },
          {
            label: "Resolved This Month Card",
            description: "When clicked, it displays the total number and list of canal clogs that have been successfuly resolved by the barangays during the current month. And clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen. \n\n“No clogs resolved this month” will show if there are no clogs resolved.",
          },
        ],
      },
      {
        id: "canal-net-map",
        label: "Canal Network Map",
        description: "This shows the entire map of Rosario La Union. ",
        whyItMatters: "The Canal Network Map is important because it gives the administrator a visual view of the whole canal network in Rosario, La Union, showing where each sensor node is and what condition it is in. The Map/Sat toggle and zoom buttons let the administrator view locations in the level of detail needed, while clicking a node shows its name, location, water level, and clog percentage. The color-coded risk legend helps the administrator quickly tell which locations are normal, need monitoring, or require immediate action, so problem areas can be identified and addressed faster.",
        extraSections: [
          {
            label: "Map View Toggle",
            description: "Lets the admin switch the canal map's display between “Map” (standard street map) views and “Sat” (satellite imagery).",
          },
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
            description: "Live Risk Level legend uses color-coded labels to help users quickly identify the condition and priority level of each monitored location. \n\nGray - Sleep Mode: Indicates that the sensor node is currently inactive or in sleep mode and is not actively monitoring the canal. \nBlue - Normal: Indicates that the canal is operating under normal conditions, with no immediate risk detected. \nOrange - Warning: Indicates that an unusual or potentially hazardous condition has been detected. Users should monitor the location and consider taking preventive action. \nRed - Critical: Indicates a high-risk or potentially severe canal condition that requires immediate attention and appropriate intervention. \nPurple - Under maintenance: Indicates that the sensor device is undergoing a maintenance.",
          },
          
          
        ],
      },
      {
        id: "live-waste-classification",
        label: "Live Waste Classification",
        description: "This is the Live Waste Classification feed, listing recent sensor readings where each card shows the dominant waste category (biodegradable or recyclable in this case) as detected by the AI model, along with its confidence score, sensor/node ID, and detection timestamp — with residual and special waste as the other possible dominant categories that could appear depending on which one the model finds most prevalent in that reading.",
        whyItMatters: "The Live Waste Classification feed is important because it shows the administrator what kind of waste the AI model is detecting in the canals as it happens. Each reading card displays the dominant waste category, confidence score, node ID, and detection time, so the latest findings can be reviewed at a glance. Opening a reading reveals the barangay, estimated waste volume, and the full composition breakdown, which helps the administrator judge the kind and scale of the obstruction and decide what action is needed. When no readings have been recorded for the day, the “No waste classification today” message makes it clear that nothing has been detected.",
        extraSections: [
          {
            label: "Selected Waste Classification Reading",
            description: "This is the detail view that opens when a user tap a reading card: it shows the node ID, barangay, detection timestamp, and confidence score for that reading, along with the estimated waste volume and a full composition breakdown showing the percentage of recyclable, biodegradable, residual, and special waste detected — with the dominant category displayed as the card's overall classification label.",
          },
          {
            label: "Live Waste Classification (Empty state)",
            description: "When no waste readings have been recorded for the day, the panel displays a “No waste classification today” message in place of the reading list.",
          },
        ],
      },
      {
        id: "live-alerts",
        label: "Live Alerts",
        description: "This shows the Live Alerts section displays real-time notifications generated by the canal monitoring system. It allows users to quickly identify potential hazards, sensor issues, and changes in canal conditions that may require attention. \n\nRed - Critical Clog: Indicates that a critical clog has been detected in the canal and requires immediate attention. \nOrange - Water Level Rising: Indicates that the water level at the monitored location is increasing and may require monitoring or preventive action. \nYellow – Low Battery: Indicates that the battery level of the sensor node is low and may require battery replacement or maintenance. \nPurple – Sensor Failure: Indicates that a sensor node has experienced a failure and may no longer be providing reliable monitoring data. Inspection or maintenance is required. \nBlue – Weak Signal: Indicates that the sensor node has a weak communication signal, which may affect the transmission of monitoring data.",
        whyItMatters: "The Live Alerts section is important because it notifies the administrator of canal hazards and sensor problems as they happen. The color-coded alerts show the type of issue at a glance, from critical clogs and rising water levels to low battery, sensor failure, and weak signal, so the most urgent ones can be addressed first. Opening an alert shows the node ID, barangay, detection time, and the sensor readings at the time of the alert, which helps the administrator decide what action is needed. When there are no active alerts for the day, the “No alerts today” message confirms that nothing requires attention.",
        extraSections: [
          {
            label: "Selected Alert",
            description: "This is the alert detail modal opened from the Live Alerts section: it shows the alert type , the node ID, barangay, and detection timestamp, plus detail fields for severity, water flow status, water level, and water flow rate readings from that sensor node at the time of the alert.",
          },
          {
            label: "Live Alert (Empty State)",
            description: "When there are no active alerts for the day, the panel displays a “No alerts today” message in place of the alert list.",
          },
          
        ],
      },
      
      {
        id: "reporting-progress",
        label: "Barangays Reported",
        description: "Displays the reporting progress for the month, showing the percentage and number of barangays (out of the total 33) that have submitted at least one report. A progress bar visually represents this percentage, with a summary below indicating how many barangays have reported and how many have not yet submitted any report for the period. \n\nClicking this section opens the Barangay Reporting modal for a detailed list.",
        whyItMatters: "The Barangays Reported section is important because it shows how many of the 33 barangays have submitted reports for the month. The modal lists which barangays have and have not reported, so the administrator can follow up with those that have not, and the confirmation message shows when nothing is pending.",
        extraSections: [
          {
            label: "Barangay Reporting Modal",
            description: "Opens after clicking the Reporting Progress bar on the Dashboard, showing which barangays have submitted reports for the month. The modal includes two filter tabs: “Not yet reported,” which lists barangays that have not submitted a report, and “Reported,” which lists barangays that have, along with the number of reports and the date of the most recent submission. \n\nClicking the close button (×) oranywhere outside the modal dismisses the view and returns to the previous screen.",
          },
          {
            label: "Reports Cleared Modal",
            description: "When all reported canals have been fully cleared, it instead displays a confirmation message indicating there is nothing pending for that period.",
          },
          
        ],
      },
      {
        id: "sensor-node-health-summary",
        label: "Sensor Node Health Summary",
        description: "This provides an overview of the average health and performance of all active sensor nodes in the system. It helps users monitor key indicators that affect the reliability and connectivity of the sensor nodes",
        whyItMatters: "The Sensor Node Health Summary is important because it shows the average battery voltage and 4G signal strength of all active sensor nodes. Clicking each card lists the individual nodes per barangay, helping the administrator find nodes that need battery replacement or have weak connectivity before they stop working.",
        extraSections: [
          {
            label: "Battery Voltage Card",
            description: "This displays the average battery voltage across all active sensor nodes. The visual bar provides a quick indication of the overall power level, helping users monitor battery status and identify nodes that may require battery maintenance or replacement. If no readings are currently available, the system displays “No data” until readings are received from the active sensor nodes. \n\nClicking this card shows a modal that displays the list of all active sensor nodes in a barangay and its battery voltage. \nAnd clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen.",
          },
          {
            label: "4G Signal Card",
            description: "This displays the average 4G signal strength of all active sensor nodes, measured in dBm. The visual bar provides a quick indication of network connectivity quality, helping users assess the connection between the sensor nodes and the system. If no readings are currently available, the system displays “No data” until readings are received from the active sensor nodes. \n\nClicking this card shows a modal that displays the list of all active sensor nodes in a barangay and its Signal.\nAnd clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen.",
          },
          {
            label: "Sensor Continuity Card",
            description: "This displays the average continuity status of all active sensor nodes. The visual bar provides a quick indication of the overall sensor health, helping users determine whether the sensors are operating consistently and maintaining reliable monitoring. If no readings are currently available, the system displays “No data” until readings are received from the active sensor nodes. \n\n Clicking this card shows a modal that displays the list of all active sensor nodes in a barangay and its sensor continutity status, if it's a Pass or Fail.\nAnd clicking the close button (×) or anywhere outside the modal dismisses the view and returns to the previous screen.",
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
        whyItMatters: "The Monitoring page is important because it lets the administrator track the real-time status of every canal sensor node in one place. It shows key data such as critical events, warnings, water levels, flow rates, and clog levels, while the search, filter, and locate tools help the administrator quickly find and assess a specific node. This allows problems to be spotted early and addressed before they become serious.",
        
      },
      {
        id: "date-time",
        label: "Live Date and Time",
        description: "Displays the current date and a continuously updating clock alongside a LIVE status indicator, confirming that the Monitoring page is actively displaying real-time data from the system.",
        whyItMatters: "The live date and time display is important because it shows the current date and a continuously updating clock with a LIVE indicator. This confirms that the Monitoring page is showing real-time data, so the administrator can trust that the readings are current and not outdated.",
        
      },
      {
        id: "summary-cards-monitoring",
        label: "Summary Cards",
        description: "These shows the summary of the Key Performance Indicator cards such as the occupied nodes, critical events, warning water level, and normal water level.",
        whyItMatters: "The summary cards are important because they give the administrator a quick count of how many nodes are occupied, in critical condition, at warning water level, and at normal water level. This shows the overall state of the canal network at a glance and helps the administrator see right away whether any locations need attention.",
        
      },
      {
        id: "canal-sensor-nodes-tbl",
        label: "Canal Sensor Nodes Table",
        description: "This table lists every sensor node installed along the canals and shows each node's current status and readings. \n\nThe Node ID is the unique number of each sensor, and the Barangay column tells which barangay the sensor is in. The Location column has a “View on map” button that shows exactly where the sensor is placed. The Device Status tells whether the sensor is working. \n\nThe next columns show the sensor's readings. The Water Level shows how high the water is in the canal, and the Flow Rate shows how fast the water is moving. The Clog column tells if the sensor detected trash or debris blocking the canal. Finally, the Condition gives the overall result based on these readings",
        whyItMatters: "The Canal Sensor Nodes table is important because it lists every sensor node with its status and readings, helping the administrator see which canals need attention. The “View on map” and “Open in Maps” options show the exact location of a node, making it easier to send personnel to the right spot.",
        extraSections: [
          {
            label: "View on Map",
            description: "Clicking the “View on map” button opens a map displaying the selected sensor node’s location and Live Risk Level. The panel also shows the node ID, geographic coordinates. \n\nClicking the “Open in Maps” option will redirect you to an external map service, where you can view the sensor node’s exact location and access additional mapping features.",
          },
        ]
      },
      {
        id: "search-filter-nodes",
        label: "Search and Filter Node | Barangay",
        description: "Users can search for a specific sensor node or barangay, filter the list by All, Critical, Warning, or Normal conditions, and view each node's water level, flow rate, clog percentage, and current condition.",
        whyItMatters: "The search and filter tools are important because they help the administrator quickly find a specific sensor node or barangay without scrolling through the whole list. Filtering by All, Critical, Warning, or Normal lets the administrator focus on the nodes that need attention first, while the displayed water level, flow rate, clog percentage, and condition give the details needed to decide what action to take.",
        
      },
      {
        id: "device-status",
        label: "Device Status",
        description: "The Device Status tells whether the sensor is working: “Active” (Green) means it is online and sending data, “Inactive” (Gray) means it is offline, and “Maintenance” (Purple) means it is temporarily being checked, repaired, or serviced, so its readings may not be available. \n\nThese statuses are shown in the table for each sensor node.",
        whyItMatters: "The Device Status is important because it shows whether each sensor node is working. Active means it is sending data, Inactive means it is offline, and Maintenance means it is being serviced, so the administrator knows which readings can be trusted and which nodes need attention.",
        
      },
      {
        id: "clog-lvl-legend",
        label: "Clog Level Legend",
        description: "This indicates the severity of clogging detected by the sensor nodes based on the percentage of blockage. It uses color-coded levels to help users quickly identify the current clog condition. \n\nRed - represents Critical (67-100%), indicating a severe level of blockage. \nYellow represents Warning (34–66%), indicating a moderate level of blockage that requires monitoring. \nGreen represents Normal (0-33%), indicating a low or acceptable level of clogging \n\nThese statuses are also shown in the table for each sensor node.",
        whyItMatters: "The Clog Level Legend is important because it uses colors to show how severe the blockage is at each sensor node. Red (67-100%) means critical, yellow (34-66%) means warning, and green (0-33%) means normal, so the administrator can quickly tell which canals need immediate action and which only need monitoring.",
      },
      {
        id: "overall-status-legend",
        label: "Overall Status Legend",
        description: "Shows the number of sensor nodes under each status level: Critical (red), Warning (yellow), and Normal (green). Each node’s status is determined by the worse of its water level and clog percentage readings. \n\nThese same status indicators are also displayed in the table for each node, allowing the admin to quickly identify which nodes need attention.",
        whyItMatters: "The Overall Status Legend is important because it shows how many sensor nodes are in critical, warning, or normal condition. Since each node’s status is based on the worse of its water level and clog percentage, the administrator can quickly see which nodes need attention first.",
      },
      {
        id: "live-alerts",
        label: "Live Alerts",
        description: "This shows the Live Alerts section displays real-time notifications generated by the canal monitoring system. It allows users to quickly identify potential hazards, sensor issues, and changes in canal conditions that may require attention. \n\nRed - Critical Clog: Indicates that a critical clog has been detected in the canal and requires immediate attention. \nOrange - Water Level Rising: Indicates that the water level at the monitored location is increasing and may require monitoring or preventive action. \nYellow – Low Battery: Indicates that the battery level of the sensor node is low and may require battery replacement or maintenance. \nPurple – Sensor Failure: Indicates that a sensor node has experienced a failure and may no longer be providing reliable monitoring data. Inspection or maintenance is required. \nBlue – Weak Signal: Indicates that the sensor node has a weak communication signal, which may affect the transmission of monitoring data.",
        whyItMatters: "The Live Alerts section is important because it notifies the administrator of canal hazards and sensor problems as they happen. The color-coded alerts show the type of issue at a glance, from critical clogs and rising water levels to low battery, sensor failure, and weak signal, so the most urgent ones can be addressed first.",
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
        whyItMatters: "The Alerts page is important because it gives the administrator one place to review all system notifications and events detected by the sensor nodes. This makes it easier to track what has happened, spot problems that need attention, and respond quickly without checking each module separately.",
        
      },
      {
        id: "search-filter-alert",
        label: "Search and Filter Notification",
        description: "Users can search notifications, filter alerts by barangay and date, and select specific alert types such as Water Level Rising, Low/Moderate/Critical Clog, Node Offline, Low Battery, Weak Signal, Sensor Failure and  Report Submitted to quickly identify and review relevant alerts.",
        whyItMatters: "The search and filter tools are important because they help the administrator quickly find relevant alerts. Filtering by barangay, date range, and alert type lets the administrator focus on a specific area, time period, or issue instead of reviewing every notification.",
        extraSections: [
          {
            label: "Barangay Filter",
            description: "A dropdown that lets the admin filter the displayed data by registered barangay. Selecting “All Barangay” shows data from every barangay, while choosing a specific barangay shows only that barangay’s data.",
          },
          {
            label: "Date Range Filter",
            description: "A dropdown that lets the admin filter the displayed data by time period, with options for “Today,” “Last 7 days,” and “Last 30 days.” The currently selected option is marked with a checkmark.",
          },
        ],
      },
      {
        id: "notif-tbl",
        label: "Notification Table",
        description: "Lists all alerts and reports received by the system, showing the node ID, alert type, barangay, and date and time detected for each entry. Alert types are color-coded for quick identification, such as Report Submitted (green), Low Clog Detected (yellow), Water Level Rising (blue), and Critical Clog Detected (red).",
        whyItMatters: "The Notification Table is important because it lists all alerts and reports in one place, showing the node ID, alert type, barangay, and time detected. The color-coded alert types help the administrator spot urgent issues quickly, dimmed read notifications show which ones have already been reviewed, and the pagination controls make it easy to browse through longer lists without losing track of entries.",
        extraSections: [
          {
            label: "Read Notification",
            description: "Notifications that have already been read appear dimmed in the list, allowing the admin to easily distinguish them from unread notifications, which are displayed in full color.",
          },
          {
            label: "Pagination Controls",
            description: "Located at the bottom of the table, they show the current page number and total number of pages (e.g., “Page 1 of 3”). Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
          },
        ],
      },
      {
        id: "alert-report-tbl",
        label: "Report Submitted modal",
        description: "Opens when a report notification is clicked from the Notifications dropdown, showing a summary of the barangay-submitted report, including the barangay name, date and time detected, purok, and severity level. \n\nClicking close button (×) dismisses the modal.",
        whyItMatters: "The Report Submitted modal is important because it gives the administrator a quick summary of a barangay report, including the barangay, time detected, purok, and severity level, without leaving the Alerts page. The View Report button then leads to the Barangay Reports tab for the full details, while the close button (×) lets the administrator dismiss the modal and continue working.",
        extraSections: [
          {
            label: "View Report Button",
            description: "Located at the bottom of the Report Submitted modal; clicking it navigates the admin to the Barangay Reports tab, where the full report is opened for detailed review.",
          },
        ],
      },
      {
        id: "alert-sensor-tbl",
        label: "Sensor Notification",
        description: "Opens when a sensor reading alert is clicked from the Notifications dropdown, showing the alert type, the node ID, barangay, and date and time detected. The details section displays the dominant waste type, estimated volume, and confidence score, along with the composition breakdown of recyclable, biodegradable, residual, and special waste. \n\nClicking the close button (×) dismisses the modal.",
        whyItMatters: "The Sensor Notification modal is important because it gives the administrator a quick view of a sensor alert, including the node, barangay, and time detected. The dominant waste type, estimated volume, confidence score, and waste composition breakdown help the administrator judge how serious the obstruction is and decide what action is needed, while the close button (×) lets them dismiss the modal and continue working.",
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
        whyItMatters: "The Canal Hotspots page is important because it gives the administrator an overview of all designated canal hotspots across the barangays, including how many there are and whether each is available or occupied. This helps the administrator see which hotspots already have sensor nodes and which are still open for assignment, making deployment easier to plan.",
        
      },
      {
        id: "summary-cards-monitoring",
        label: "Summary Cards",
        description: "Displayed at the top of the Canal Hotspots tab, these cards give a quick overview of the canal hotspots in the system: Total Hotspots shows the overall number of registered hotspots, Available shows how many are not yet assigned to a sensor node, and Occupied shows how many are currently assigned to a sensor node.",
        whyItMatters: "The summary cards are important because they give the administrator a quick count of all registered hotspots, how many are still available, and how many already have a sensor node assigned. This shows at a glance how much of the canal network is covered and how many locations are still open for new sensor deployment.",
        
      },
      {
        id: "search-filter-canal-hotspot",
        label: "Search and Filter Canal Hotspots",
        description: "Located above the hotspot list, these tools help the admin find specific canal hotspots quickly. \n\nThe search field lets the admin type a keyword to narrow the list to matching hotspots, while the Barangay filter dropdown limits the list to hotspots in a selected barangay, or shows all of them when “All Barangays” is chosen.",
        whyItMatters: "The search and filter tools are important because they help the administrator quickly find specific canal hotspots. Searching by keyword and filtering by barangay narrows the list to the area of interest, so the administrator does not have to scroll through every hotspot.",
        extraSections: [
          {
            label: "Barangay Filter",
            description: "This is a dropdown located above the table that lets the admin filter the listed hotspots by barangay. It lists all registered barangays, and selecting “All Barangays” shows entries from every barangay, while choosing a specific barangay shows only that barangay’s entries. \n\nThe currently selected option is marked with a checkmark.",
          },
        ],
      },
      {
        id: "hotspot-tbl",
        label: "Hotspot Table",
        description: "Displays the registered barangays and the canal hotspots assigned to each, showing the barangay ID, barangay name, and the number of hotspots it currently has. The Actions column provides two buttons per barangay: View, which expands the barangay’s list of hotspots (the number in parentheses shows how many), and Add Hotspot, which allows the admin to register a new canal hotspot under that barangay.",
        whyItMatters: "The Hotspot Table is important because it organizes all canal hotspots by barangay, showing how many each one has. The View button expands the list with each hotspot’s name, shape, description, and status, while “View on map” shows its exact location and whether it is available or occupied. The Add Hotspot button lets the administrator register new locations, keeping the hotspot records complete and up to date.",
        extraSections: [
          {
            label: "View Dropdown",
            description: "Clicking the View button expands the row to display the list of hotspots registered under that barangay, showing each hotspot's name, shape, description, and status.",
          },
          {
            label: "View on Map",
            description: "Clicking the “View on map” opens a modal displaying the hotspot's name and exact location on an interactive map, along with its coordinates and a status legend (Available/Occupied).",
          },
        ],
      },
      {
        id: "add-hotspot",
        label: "Add Canal Hotspot",
        description: "Clicking the “Add Hotspot” button opens the hotspot registration form, where users can enter the hotspot’s name and description, specify the canal properties such as width, shape, depth, and sensor height, and select its geographic location on the map. \n\nThe hotspot coordinates are automatically recorded when the user clicks within the highlighted barangay boundary.",
        whyItMatters: "The Add Canal Hotspot form is important because it records each hotspot’s name, canal dimensions, and exact location in the system. The canal measurements are taken once at installation, and pinning the location inside the barangay boundary keeps the coordinates accurate. The confirmation messages for adding or canceling let the administrator review the details first and prevent accidental registration or loss of entered information.",
        extraSections: [
          {
            label: "Hotspot Information",
            description: "This section of the Add Hotspot form is where the admin enters the basic identity details of the canal hotspot. \n\nThe Barangay field is pre-filled with the barangay selected for the hotspot and cannot be edited. \nThe Hotspot Name field is also pre-filled with the next available name (e.g., “CH-Alipang-1”), which the admin can adjust if needed. \nThe Description field is required and is used to enter a brief description or landmark of the hotspot’s location.",
          },
          {
            label: "Canal Properties",
            description: "This section is where the admin enters the physical dimensions of the canal at the hotspot, measured once at installation. \n\nThe Canal Width field is for the canal’s width in meters, the Canal Shape dropdown is for selecting the canal’s shape, the Canal Depth field is for the canal’s depth in centimeters, and the Sensor Height field is for the height at which the sensor is installed, also in centimeters.",
          },
          {
            label: "Geographic Location",
            description: "The section of the Add Hotspot form where the admin pins the hotspot’s exact location. The map automatically zooms to the selected barangay and highlights its boundary, and the admin clicks anywhere inside the highlighted area to place the pin. \n\nRequired fields below the map that hold the coordinates of the pinned location, which are filled in automatically once the admin clicks a point inside the barangay boundary.",
          },
          {
            label: "Add Confirmation",
            description: "Clicking the “Add Hotspot” button will display a confirmation modal asking the user to confirm the registration of the new hotspot. This ensures that all entered information is reviewed and confirmed before the hotspot is added to the system. \n\nClicking the “Cancel” button will display a confirmation modal asking the user to confirm whether they want to cancel the hotspot registration or keep editing. This ensures that the user does not accidentally discard the information entered for the new hotspot.",
          },
        ],
      },
      {
        id: "more-actions",
        label: "More Actions Menu",
        description: "Opened by clicking the three-dot icon (⋮) beside a hotspot in the list, it provides additional options for managing that hotspot. View History shows the hotspot’s record of past activity, Edit allows the admin to update the hotspot’s details, and Remove deletes the hotspot from the system.",
        whyItMatters: "The More Actions menu is important because it gives the administrator quick access to everything needed to manage a single hotspot. View History shows its past activity, Edit keeps its details accurate and up to date, and Remove deletes hotspots that are no longer needed, so the hotspot records stay complete and organized.",
      },
      {
        id: "view-history-hotspot",
        label: "View History",
        description: "Opens after clicking “View History” from the More Actions menu, showing the record of sensor nodes that have been assigned to the selected hotspot. The table lists each node, the date it was assigned (From), the date its assignment ended (To), and the reason for the change.",
        whyItMatters: "The More Actions menu is important because it gives the administrator quick access to everything needed to manage a single hotspot. View History shows its past activity, Edit keeps its details accurate and up to date, and Remove deletes hotspots that are no longer needed, so the hotspot records stay complete and organized.",
        extraSections: [
          {
            label: "Export Button",
            description: "The Export button allows the admin to download the history record.",
          },
          {
            label: "Pagination Controls",
            description: "The pagination controls (Previous and Next) navigate between pages of entries, and the close button (×) dismisses the modal.",
          },
        ],
      },
      {
        id: "edit-hotspot",
        label: "Edit Canal Hotspot",
        description: "Clicking Edit opens a form pre-filled with the hotspot's existing details. Hotspot Information (barangay, name, description), Canal Properties (width, shape, depth, sensor height), and Geographic Location (map pin with latitude/longitude). Allowing the user to update any field. Changes are saved by clicking Save Changes, or discarded by clicking Cancel.",
        whyItMatters: "The Edit Canal Hotspot form is important because it lets the administrator update a hotspot’s details, canal measurements, and pinned location to keep records accurate. The confirmation dialogs let the administrator review changes before saving and prevent accidental loss of edits.",
        extraSections: [
          {
            label: "Hotspot Information",
            description: "This section of the Edit Hotspot form is where the admin enters the basic identity details of the canal hotspot. \n\nThe Barangay field shows the barangay the hotspot belongs to and cannot be edited. The Hotspot Name and Description fields are pre-filled with the hotspot’s current details and can be revised as needed.",
          },
          {
            label: "Canal Properties",
            description: "This section is where the admin updates the physical dimensions of the canal at the hotspot. \nThe Canal Width (meters), Canal Shape, Canal Depth (cm), and Sensor Height (cm) fields are pre-filled with the saved values and can be changed if the measurements need to be corrected.",
          },
          {
            label: "Geographic Location",
            description: "The section where the admin adjusts the hotspot’s pinned location. The map displays the hotspot’s current position within the highlighted barangay boundary, and clicking a new point inside the boundary moves the pin.",
          },
          {
            label: "Add Confirmation",
            description: "Clicking the “Add Hotspot” button will display a confirmation modal asking the user to confirm the registration of the new hotspot. This ensures that all entered information is reviewed and confirmed before the hotspot is added to the system. \n\nClicking the “Cancel” button will display a confirmation modal asking the user to confirm whether they want to cancel the hotspot registration or keep editing. This ensures that the user does not accidentally discard the information entered for the new hotspot.",
          },
          {
            label: "Changes Confirmation",
            description: "After clicking Save Changes, a Confirm Changes dialog appears asking the user to verify the update. Clicking Confirm Changes finalizes and saves the updates, while clicking Keep Editing returns to the edit form without saving. \n\nClicking Cancel while there are unsaved changes triggers a Cancel Changes confirmation dialog, warning the user that unsaved changes will be lost. Clicking Yes, Cancel discards the changes and closes the form, while clicking Keep Editing returns to the edit form without discarding anything.",
          },
        ],
      },
      {
        id: "remove-hotspot",
        label: "Remove Canal Hotspot",
        description: "Clicking Remove opens a confirmation dialog warning that the action cannot be undone. Clicking Remove permanently deletes the hotspot, while clicking Cancel closes the dialog without making any changes.",
        whyItMatters: "This section is important because it prevents accidental deletion of canal hotspots by requiring confirmation before removal. It helps ensure that only intended hotspots are permanently deleted.",
        
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
        whyItMatters: "This section is important because it helps users monitor and manage all registered IoT sensor nodes. It allows them to check node availability, track occupancy, and keep sensor information updated for proper system operation.",
        
      },
      {
        id: "node-man-summary-cards",
        label: "Summary Cards",
        description: "Displayed at the top of the Node Management tab, these cards give a quick overview of the IoT sensor nodes in the system: Total Nodes shows the overall number of registered nodes, Available shows how many are not yet assigned to a canal hotspot, and Occupied shows how many are currently assigned to a canal hotspot.",
        whyItMatters: "These cards are important because they provide a quick summary of registered sensor nodes, helping users easily monitor which nodes are available and which are already assigned to canal hotspots.",
      
      },
      {
        id: "search-filter-nodes",
        label: "Search and Filter Nodes",
        description: "Clicking the All Status dropdown reveals filter options allowing the admin to narrow the IoT Sensor Nodes table to show only nodes matching the selected availability status. Next to the status filter, the Search node bar lets the admin quickly find a specific node by typing its name or ID.",
        whyItMatters: "The Search and Filter Nodes section is important because it helps the admin easily find specific sensor nodes and filter them based on their status, such as available, occupied, or retired. This makes it easier to monitor and manage sensor nodes efficiently without having to browse the entire list.",
        extraSections: [
          {
            label: "Filter Status",
            description: "Clicking the All Status dropdown reveals filter options such as All Status, Available, Occupied, and Retired to narrow the IoT Sensor Nodes table to show only nodes matching the selected availability status.",
          },
        ],
      },
      {
        id: "iot-sensor-nodes-tbl",
        label: "IoT Sensor Nodes Table",
        description: "This Sensor nodes table lists each node's Node ID, Node Name, current Availability status (Available, Occupied, or Retired), and More Actions (Edit and additional options via the three-dot (⋮) menu).",
        whyItMatters: "The IoT Sensor Nodes Table section is important because it provides an organized view of all registered sensor nodes, including their IDs, names, and availability status. It also allows the admin to edit node information and access additional actions, making sensor node management easier and more efficient.",
      },
      {
        id: "add-node",
        label: "Add Node",
        description: "Clicking Add Node button opens the Add Node modal, allowing the admin to register a new IoT sensor node into the system.",
        whyItMatters: "The Add Node section is important because it allows the admin to register new IoT sensor nodes in the system. It includes confirmation dialogs to prevent accidental actions, loading indicators to show that the system is processing requests, and a device key generation process to ensure secure device configuration. It also provides success and error messages to confirm registration or notify the admin when a duplicate node name is entered.",
        extraSections: [
          {
            label: "Add Node Modal",
            description: "This opens after clicking the Add Node button on the Node Management page, allowing the user to register a new IoT sensor node into the system. The Node Name field is automatically pre-filled with the next available identifier, which the user can adjust before confirming with the Add button.",
          },
          {
            label: "Confirm Adding Dialog",
            description: "Appears when the user clicks Add Node button on the Add Node modal, asking for confirmation before proceeding. Clicking Keep Editing returns to the form, while Add Node confirms and proceeds with registering the new sensor node.",
          },
          {
            label: "Cancel Adding Confirmation",
            description: "Appears when the user clicks Cancel while the Add Node modal is open, asking for confirmation before discarding the entry. Clicking Keep Editing returns to the form, while Yes, Cancel discards the entry and closes the modal.",
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
          {
            label: "Something Went Wrong Dialog (Duplicate Node)",
            description: "Appears when the admin tries to add a sensor node using a node name that already exists in the system, informing them that a sensor node with that code already exists. Clicking “Okay” dismisses the dialog and returns the admin to the Add Node form.\n\nAfter the dialog is dismissed, the Node Name field in the Add Node form is outlined in red, with a message below it stating that a sensor node with this code already exists. The admin must change the node name to a unique one before the node can be added.",
          },
        ]
      },
      {
        id: "edit-node",
        label: "Edit Node",
        description: "Clicking Edit on a node opens the Node Information dialog, pre-filled with the node's current name  and a Generate New Key option to reassign its key.",
        whyItMatters: "The Edit Node section is important because it allows the admin to update existing sensor node information and generate a new device key when needed. It includes confirmation dialogs to prevent accidental changes or cancellation, loading indicators to show that updates are being processed, and success messages to confirm that the changes have been saved. These features help maintain accurate node information and secure device communication.",
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
        label: "More Actions Menu",
        description: "Clicking the three-dot (⋮) button next to a node opens a menu with three additional actions (View History, Decomission, Unassign) if the Node's availability is Occupied, while two actions (View History and Decomission) for Available status.",
        whyItMatters: "The More Actions Menu section is important because it allows the admin to access additional node management options, such as viewing history, decommissioning a node, or unassigning it from a canal hotspot. These options help the admin manage sensor nodes based on their current availability status.",
      },
      {
        id: "view-history-node",
        label: "View History",
        description: "Opens when the admin views the history of a sensor node from the Node Management tab, providing a record of the node’s past activity across three tabs: Readings History, Health History, and Hotspot History.",
        whyItMatters: "The View History section is important because it allows the admin to review a sensor node’s past readings, health checks, and hotspot assignments. The Export button allows records to be downloaded for documentation, while filters and pagination help users find specific information more easily. These features support sensor monitoring, performance tracking, and record management.",
        extraSections: [
          {
            label: "Export",
            description: "The Export button allows the admin to download the records",
          },
          {
            label: "Reading History Tab",
            description: "Lists the sensor readings recorded by the node, showing each reading’s timestamp, hotspot name, water level, flow rate, clog percentage, water status, clog status, and overall status. \n\nThe Status filter narrows the entries by status (All Status, Normal, Warning, or Critical), while the Hotspot filter limits them to a specific canal hotspot.",
          },
          {
            label: "Health History Tab",
            description: "Lists the health checks recorded for the node, showing when each check was performed (Checked At), its status, and the node’s battery, signal, and sensor readings. \n\nThe Status filter narrows the entries by health status (Normal, Warning, or Critical), while the date range fields (from and to) limit them to a chosen period. Once a date is selected, a Clear Filter option appears to reset the date range. \n\nWhen no records match the selected filters, the table displays a “No health checks match these filters” message.",
          },
          {
            label: "Hotspot History Tab",
            description: "Lists the canal hotspots the node has been assigned to, showing the hotspot, its barangay, the date the assignment started (From) and ended (To), and the reason for the change. \n\nThe filter dropdown narrows the entries by assignment status (All, Current, Reassigned, Maintenance, Retired, or Unassigned), with the selected option marked by a checkmark.",
          },
          {
            label: "Pagination Controls",
            description: "Located at the bottom of the Node History modal, they show the current page number (e.g., “Page 1”) and let the admin move through the node’s records. Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
          },
          {
            label: "Close History",
            description: "The close button (×) dismisses the modal.",
          },
        ],
      },
      {
        id: "un-assign-node",
        label: "Unassign Node",
        description: "Unassign opens a confirmation dialog asking whether to remove the node's current assignment; confirming returns the node to Available status.",
        whyItMatters: "The Unassign Node section is important because it allows the admin to remove a sensor node's current canal hotspot assignment and return it to Available status. The success dialog confirms that the process is complete, ensuring the node can be reassigned when needed.",
        extraSections: [
          {
            label: "Success Dialog (Node Unassigned)",
            description: "Confirms that the sensor node has been successfully unassigned from its canal hotspot and is now available for reassignment. Clicking “Done” closes the dialog and returns the admin to the Node Management tab.",
          },
        ],
      },
      {
        id: "decomission-node",
        label: "Decomission Node",
        description: "Appears when the admin chooses to decommission a sensor node from the Node Management tab, asking for confirmation before proceeding. Decommissioning marks the node as retired and removes it from active monitoring. Clicking “Cancel” dismisses the dialog without making changes, while “Decommission” confirms and retires the node.",
        whyItMatters: "The Decommission Node section is important because it allows the admin to retire sensor nodes that are no longer needed and remove them from active monitoring. Confirmation and success dialogs help prevent accidental decommissioning, while the restriction on occupied nodes ensures that a sensor node is unassigned from its canal hotspot before retirement.",
        extraSections: [
          {
            label: "Success Dialog (Node Decommissioned)",
            description: "Confirms that the sensor node has been successfully decommissioned, marking it as retired and removing it from active monitoring. Clicking “Done” closes the dialog and returns the admin to the Node Management tab.",
          },
          {
            label: "Cannot Decommission Node Dialog",
            description: "Appears when the admin attempts to decommission a sensor node that is currently occupied (assigned to a canal hotspot). The dialog notifies the admin that the node must first be unassigned from its hotspot before it can be decommissioned. Clicking “Close” or “Okay” dismisses the dialog and returns the admin to the Node Management tab.",
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
        whyItMatters: "The Node Assignment Overview section is important because it helps the admin monitor assigned sensor nodes, check their status, and view their canal hotspot locations. It also allows the admin to edit assignment details or unassign nodes when needed, ensuring proper monitoring and management of sensor deployments.",
        
      },
      {
        id: "node-assign-summary-cards",
        label: "Summary Cards",
        description: "These shows the summary of the Key Performance Indicator cards such as the assigned nodes, Active nodes, and Inactive nodes.",
        whyItMatters: "The Summary Cards section is important because it provides a quick overview of the total assigned, active, and inactive sensor nodes. It helps the admin easily monitor node assignments and check their current operational status.",
      },
      {
        id: "search-filter-nodes",
        label: "Search and Filter Nodes",
        description: "The search field finds an assigned node by keyword, and the status filter narrows the list by status.",
        whyItMatters: "The Search and Filter Nodes section is important because it helps the admin quickly find specific assigned sensor nodes and filter them by status, such as Active or Inactive. This makes monitoring node assignments faster and more organized.",
        extraSections: [
          {
            label: "Filter Status",
            description: "Clicking the All Status dropdown reveals filter options such as All Status, Active, and Inactive allowing the admin to narrow the Assigned Nodes table to show only nodes matching the selected availability status. ",
          },
        ],
      },
      {
        id: "assigned-canal-node-tbl",
        label: "Assigned Canal Nodes Table",
        description: "This is the list of nodes currently assigned to a hotspot, showing its Node number, Barangay, Node Name, Hotspot, Location , Status, Installed date, and available Actions to Edit or Unassign the node.",
        whyItMatters: "The Assigned Canal Nodes Table section is important because it provides an organized list of sensor nodes assigned to canal hotspots, including their locations, statuses, and installation dates. The View on Map feature helps the admin identify the exact location of a sensor node through map coordinates, making it easier to monitor and manage sensor deployments.",
        extraSections: [
          {
            label: "View on Map",
            description: "Clicking View on Map opens a dialog showing the selected node's location pinned on the map, along with its exact latitude and longitude coordinates. \n\nClicking the “Open in Maps” option will redirect you to an external map service, where you can view the sensor node’s exact location and access additional mapping features.",
          },
        ],
      },
      {
        id: "assign-node",
        label: "Assign Node",
        description: "Clicking Assign Node opens the Assign Node form, where you select a Node, Barangay, and Hotspot, and set the Installed At date.",
        whyItMatters: "The Assign Node section is important because it allows the admin to assign sensor nodes to specific barangays and canal hotspots while recording the installation date. It automatically displays the hotspot's geographic coordinates and availability status, helping ensure accurate placement. Required fields and confirmation dialogs also help prevent incomplete or accidental assignments.",
        extraSections: [
          {
            label: "Assignment Details",
            description: "The Node, Barangay, and Hotspot dropdowns only list options already registered in the Node Management, Barangay Management, and Canal Hotspots modules. The Hotspot dropdown becomes available once a barangay is selected and lists only that barangay’s hotspots, while the Installed At field is where the admin enters the date the node was installed at the hotspot. \n\nAll four fields are required.",
          },
          {
            label: "Geographic Location",
            description: "Once a hotspot is selected, the Geographic Location section auto-fills the Latitude and Longitude and displays a Map Preview showing the hotspot's location (marked as Available or Occupied).",
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
        id: "edit-assigned-canal-node",
        label: "Edit Assigned Canal Nodes",
        description: "Clicking Edit opens a form pre-filled with the hotspot's existing details. Node Assignment Information, barangay name, hotspot, and installed at. Allowing the user to update any field.",
        whyItMatters: "The Edit Assigned Canal Nodes section is important because it allows the admin to update existing node assignment details, such as the node, barangay, hotspot, and installation date. Confirmation dialogs help prevent accidental changes, while loading and success messages inform the admin when the updates are being processed and successfully saved.",
        extraSections: [
          {
            label: "Changes Confirmation",
            description: "Changes are saved by clicking Save Changes, or discarded by clicking Cancel.",
          },
          {
            label: "Saving Changes Dialog",
            description: "A loading indicator shown after confirming the update, confirming that the system is processing and saving the node's updated information.",
          },
          {
            label: "Success Dialog",
            description: "Confirms that the node's information has been successfully updated. Clicking Done closes the dialog and returns the user to the Node assignment page.",
          },
        ],
      },
      {
        id: "unassign-node",
        label: "Unassign Node",
        description: "Unassign opens a confirmation dialog asking whether to remove the node's current assignment; confirming returns the node to Available status.",
        whyItMatters: "The Unassign Node section is important because it allows the admin to remove a sensor node from its current canal hotspot assignment, making it available for reassignment. The confirmation and success dialogs help prevent accidental actions and ensure the admin is informed when the process is completed.",
        extraSections: [
           {
              label: "Success Dialog (Node Unassigned)",
              description: "Confirms that the sensor node has been successfully unassigned from its canal hotspot and is now available for reassignment. Clicking “Done” closes the dialog and returns the admin to the Node Management tab.",
          },
        ],
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
            description: "Displayed at the top of the Clog Events tab, these cards give a quick overview of clog activity for the selected period: Total Clog Events shows the overall number of detected clog events, Cleared Events shows how many have been resolved, Average Resolution Time shows the average time taken to resolve clog events, and Monthly Completed Events shows the number of events completed during the selected month.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            
          },
          {
            id: "search-filter-clog-events",
            label: "Search and Filter Clog Events",
            description: "Users can use the Search clog event bar to quickly find a specific event, or the All Barangay, All Severity(low, medium, high), All Status(detected, cleared), and Date dropdowns to filter results by location and severity, both can be combined to narrow the list further.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            extraSections: [
              {
                label: "Filters",
                description: "These dropdowns narrow the displayed events. The Barangay filter lists the registered barangays, the Severity filter lets the admin choose Low, Medium, or High, and the Status filter lets the admin choose Detected or Cleared. The Month filter limits the events to a selected month, or shows all months when “All Months” is chosen.",
              },
            ],
          },
          {
            id: "clog-events-tbl",
            label: "Clog Events Table",
            description: "Lists the clog events detected by the system, showing each event’s ID, severity, the date and time it was detected and resolved, its location (barangay), the water level and water flow readings at the time, its status, and the reason for its resolution. Severity is color-coded for quick identification: Low (green), Medium (yellow), and High (red). \n\nEvents that are still being addressed have a status of “Detected” and no resolution date, while resolved events show a status of “Cleared.”",
            whyItMatters: "Placeholder — explain why the detail view matters.",

          },
          {
            id: "clog-event-details",
            label: "Event Details",
            description: "Displayed on the right side of the Clog Events tab, this panel shows the full details of the clog event selected in the table. \n\nAt the top, it shows the event’s ID, its type and severity, and a color-coded severity badge. The Event Information section lists the location (barangay), the date and time detected, the sensor node that detected it, and the waste classification. The Incident Details section lists the water level and water flow readings, the severity, and the current status of the event.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
            extraSections: [
              {
                label: "Event Details Panel (Empty State)",
                description: "When no clog event has been selected in the table, the panel displays a “No Event Selected” message prompting the admin to select a record from the table to view its details.",
              },
            ],
          },
          {
            id: "export-clog-event",
            label: "Export and Print",
            description: "Located at the top right of the Clog Events tab, it allows the admin to download the clog events table as a file for record-keeping or reporting and is ready for printing. The exported data reflects the filters currently applied, such as barangay, severity, status, and month.",
            whyItMatters: "Placeholder — explain why the detail view matters.",
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
        id: "waste-classification",
        label: "Waste Classification",
        steps: [
          {
            id: "waste-classification-overview",
            label: "Waste Classification Overview",
            description: "This displays the record of waste detected in canal hotspots, showing summary metrics such Total Classifications, Biodegradable, Recyclable, and Residual/Others, along with a table listing each classification's ID, Dominant Waste Type, Timestamp, Node, Location, Reading ID, and Confidence level. ",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            
          },
          {
            id: "waste-class-summary-cards",
            label: "Summary Cards",
            description: "Displayed at the top of the Waste Classification tab, these cards give a quick overview of the AI classification results: Total Classifications shows the overall number of classifications recorded, Biodegradable shows how many readings had biodegradable waste as the dominant type, Recyclable shows how many had recyclable waste as the dominant type, and Residual/Others shows how many had residual waste or other types as the dominant type.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            
          },
          {
            id: "search-filter-waste-class",
            label: "Search and Filter Waste",
            description: "User can use the Search waste classification bar or the All Barangay, All Waste, and All Nodes dropdowns (individually or combined) to filter results.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            extraSections: [
              {
                label: "Filters",
                description: "these dropdowns narrow the displayed classifications. The Barangay filter lists the registered barangays, the Waste filter lets the admin choose Residual, Recyclable, Biodegradable, or Special Waste, and the Nodes filter lists the registered sensor nodes. The Month filter limits the classifications to a selected month and defaults to the current month (e.g., October 2026).",
              },
            ],
          },
          {
            id: "waste-class-tbl",
            label: "Waste Classification Table",
            description: "Lists the waste classifications generated by the AI model, showing each entry’s classification ID, dominant waste type, the date and time it was recorded, the sensor node that captured it, the location (barangay), the reading ID it is based on, and the model’s confidence score. The dominant waste type is displayed with an icon and label for quick identification, such as the green leaf icon for Biodegradable",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            extraSections: [
              {
                label: "Pagination Controls",
                description: "Located at the bottom of the table, they show the current page number and total number of pages (e.g., “Page 1 of 3”). Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
              },
            ],
          },
          {
            id: "selected-waste",
            label: "Classification Details",
            description: "Displayed on the right side of the Waste Classification table, this panel shows the full details of the classification selected in the table. At the top, it shows the classification ID. The Classification Information section lists the dominant waste type, the model’s confidence score, the date and time recorded, the estimated weight (kg), the location (barangay), the reading ID, and the sensor node. The Waste section shows the composition breakdown, with the percentage of Biodegradable, Recyclable, Residual, and Special Waste detected in that reading.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
            extraSections: [
              {
                label: "Classification Details (Empty Details)",
                description: "When no classification has been selected in the table, the panel prompts the admin to select a record to view its details.",
              },
            ],
          },
          {
            id: "export-waste",
            label: "Export and Print",
            description: "Export button lets the user download and print the classification log.",
            whyItMatters: "Placeholder — explain why waste classification matters.",
          
          },
        ],
      },
      {
        id: "brgy-reports",
        label: "Barangay Reports",
        steps: [
          {
            id: "brgy-monthly-reports-overview",
            label: "Barangay Monthly Reports Overview",
            description: "The Barangay Reports module allows the admin to monitor and review the reports submitted by barangay personnel on clog incidents and waste collection. At the top, summary cards show the total reports, the total waste collected (kg), the average response time, and the number of barangays that have reported. Below them, the Barangays Reported progress bar shows the percentage of barangays that have submitted at least one report for the month, alongside the Reporting Period card, which displays the date range covered. The reports table lists each submission with its date submitted (and week), barangay, purok, severity, and the personnel who filed it.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            
          },
          {
            id: "brgy-monthly-reports-summary-cards",
            label: "Summary Cards",
            description: "Displayed at the top of the Barangay Reports tab, these cards give a quick overview of the reports submitted by barangay personnel: Total Reports shows the overall number of submitted reports, Waste Collected (kg) shows the total weight of waste collected as reported, Avg. Response Time shows the average time taken by barangays to respond to clog events, and Barangays Reported shows how many barangays have submitted at least one report out of all registered barangays.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
          
          },
          {
            id: "progress-bar",
            label: "Barangays Reported",
            description: "Displays the reporting progress for the month, showing the percentage and number of barangays (out of the total 33) that have submitted at least one report. A progress bar visually represents this percentage, with a summary below indicating how many barangays have reported and how many have not yet submitted any report for the period. \n\nClicking this section opens the Barangay Reporting modal for a detailed list.",
            whyItMatters: "Placeholder — explain why filtering matters.",
            extraSections: [
              {
                label: "Barangay Reporting Modal",
                description: "Opens after clicking the Reporting Progress bar on the Dashboard, showing which barangays have submitted reports for the month. The modal includes two filter tabs: “Not yet reported,” which lists barangays that have not submitted a report, and “Reported,” which lists barangays that have, along with the number of reports and the date of the most recent submission. \n\nClicking the close button (×) oranywhere outside the modal dismisses the view and returns to the previous screen.",
              },
            
            ],
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
            description: "This table lists individual barangay report submissions, showing the date submitted, the barangay, purok, severity, who submitted it, and additional actions actions.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
    
          },
          {
            id: "view-report",
            label: "View Report",
            description: "Opens after clicking the “View” button on a report in the Barangay Reports table, showing the full report submitted by barangay personnel. The header displays the barangay and purok with a color-coded severity badge, along with a back arrow that returns to the reports table.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
            extraSections: [
              {
                label: "Report Details",
                description: "The Report Details tab presents the report as an official Canal Monitoring Report of the Municipal Environmental and Natural Resources Office, including the report number and the personnel who created it. It is divided into sections such as Monitoring Site Information, which lists the purok, barangay, city/municipality, and province, and Detection Summary, which lists the date and time observed and the severity.",
              },
              {
                label: "Photos Tab",
                description: "The Photos tab shows the images attached to the report.",
              },
            
            ],
          },
          {
            id: "export-report",
            label: "Export and Print",
            description: "Export button lets the user download and print the Barangay Report with signatories.",
            whyItMatters: "Placeholder — explain why monthly reports matter.",
    
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
            description: "Displayed at the top of the User Management tab, these cards give a quick overview of the user accounts in the system: Total Users shows the overall number of registered users, Active shows how many accounts are currently active, Inactive shows how many accounts are deactivated, and Barangay Officer shows how many users have the Barangay Officer role.",
            whyItMatters: "Placeholder — explain why user management matters.",
            
          },
          {
            id: "search-filter-user",
            label: "Search and Filter User",
            description: "The search bar lets users look up specific accounts by name or email, while the All Users (Menro Staff, Menro Officer, Barangay) and All Status (Active, Inactive) dropdown filters narrow the list by user type/role and account status.",
            whyItMatters: "Placeholder — explain why user management matters.",
            extraSections: [
              {
                label: "Filters",
                description: "These dropdowns narrow the displayed accounts. The Users filter lets the admin choose a role: MENRO Officer, MENRO Staff, or Barangay Officer, or show all users. The Status filter lets the admin choose Active or Inactive accounts.",
              },
            ],

          },
          {
            id: "user-man-tbl",
            label: "User Accounts Table",
            description: "Lists the registered user accounts in the system, showing each user’s ID, name and email address, role (e.g., Barangay Personnel), and status. The Actions column provides two buttons per user: Editand Deactivate.",
            whyItMatters: "Placeholder — explain why user management matters.",
            extraSections: [
              {
                label: "Pagination Controls",
                description: "Located at the bottom of the table, they show the current page number and total number of pages (e.g., “Page 1 of 3”). Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
              },
            ],
          },
          {
            id: "add-user",
            label: "Add User",
            description: "Clicking the Add User button opens the Add User Account page for entering the new user's details. On the left, a preview card displays placeholders for the user's picture, name, status, role, and email, while the form on the right asks for the user's first and last name, their role, barangay, and position, and the email address they will use to log in.",
            whyItMatters: "Placeholder — explain why user management matters.",
            extraSections: [
              {
                label: "",
                description: "When the Admin/Menro Staff/ Menro Officer role is selected from the Role dropdown, the Barangay and Position fields are hidden, since these do not apply to the Admin/Menro Staff/ Menro Officer role. Only the Role field remains in the Role & Assignment section, allowing the user to proceed directly with filling out the Personal Information and Account Credentials sections before creating the account.",
              },
              {
                label: "Required Field Validation",
                description: "If the admin leaves a required field empty or unselected, the field is outlined in red and the message “This field is required” appears below it.",
              },
              {
                label: "Back Button",
                description: "Located at the top right of the Add User form, it returns the admin to the User Management tab without creating a new account.",
              },
              {
                label: "Add User Confirmation",
                description: "If the role being created is Admin, a Replace Current Admin? warning modal appears, informing the user that creating a new Admin account will deactivate the current active Admin and log them out immediately. Clicking Yes, Proceed confirms the replacement and creates the new Admin account, while clicking Cancel stops the action and keeps the current Admin active. \n\nIf the role being created is MENRO Staff, MENRO Officer, or Barangay Official, a Confirm Adding User modal appears instead, simply asking the user to confirm the new account. Clicking Add User proceeds with creating the account, while clicking Keep Editing returns to the form without saving.",
              },
              {
                label: "Success User Creation",
                description: "Confirms that the new user account has been successfully created. Clicking “Done” closes the dialog and returns the admin to the User Management tab.",
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
            extraSections: [
              {
                label: "Success User Deactivation",
                description: "Confirms that the user account has been successfully deactivated, so the user can no longer access the system. Clicking “Done” closes the dialog and returns the admin to the User Management tab.",
              },
            ],
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
            label: "Registered Barangay Table",
            description: "Lists the barangays in the municipality, showing each barangay’s ID, name, location, and available action.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            extraSections: [
              {
                label: "View on Map",
                description: "Clicking  “View on map” opens a modal displaying the hotspot's exact location on an interactive map, along with its coordinates and a status legend (Available/Occupied). ",
              },
              {
                label: "Pagination Controls",
                description: "Located at the bottom of the table, they show the current page number and total number of pages (e.g., “Page 1 of 3”). Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
              },
            ],
          },
          {
            id: "register-brgy",
            label: "Register Barangay",
            description: "Clicking Register on an unregistered barangay opens a Register Barangay confirmation modal, asking the user to verify the action and noting that registering the barangay will allow sensor nodes to be deployed within its jurisdiction. \n\nClicking Register proceeds with registering the barangay, while clicking Cancel closes the modal without making any changes.",
            whyItMatters: "Placeholder — explain why barangay management matters.",
            
          },
          {
            id: "unregister-active-brgy",
            label: "Unregister Barangay",
            description: "Clicking Register on an unregistered barangay opens a Register Barangay confirmation modal, asking the user to verify the action and noting that registering the barangay will allow sensor nodes to be deployed within its jurisdiction. \n\nClicking Register proceeds with registering the barangay, while clicking Cancel closes the modal without making any changes.",
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
        id: "signatory-management",
        label: "Signatory Management",
        steps: [
          {
            id: "signatory-overview",
            label: "Signatories Overview",
            description: "The Signatories module allows the admin to manage the officials who sign the reports of each barangay. The barangay dropdown at the top right selects which barangay’s signatories are displayed. Four signatory positions are shown as cards: Barangay Secretary, Chairman Environment, Brgy. Sanitary Inspector, and Punong Barangay.",
            whyItMatters: "-",
      
          },
          {
            id: "signatory-cards",
            label: "Signatory Cards",
            description: "Each position card (Barangay Secretary, Chairman Environment, Brgy. Sanitary Inspector, and Punong Barangay) displays the current signatory’s name and a color-coded accent along its left edge. The Past Signatories section of each card remains “No past signatories yet” until a signatory is replaced.",
            whyItMatters: "-",
            
          },
          {
            id: "signatory-empty",
            label: "Signatory Cards (Empty State)",
            description: "When a barangay has no signatories assigned yet, each of the four position cards (Barangay Secretary, Chairman Environment, Brgy. Sanitary Inspector, and Punong Barangay) displays a dashed outline with the prompt “Click to add signatory.” The Past Signatories section of each card shows “No past signatories yet.” Clicking a card allows the admin to assign a signatory to that position.",
            whyItMatters: "-",
            
          },
          {
            id: "add-signatory",
            label: "Add Signatory",
            description: "Add Signatory Modal opens after clicking a signatory position card, allowing the admin to assign a signatory to that position. The Full Name field is where the admin enters the signatory’s name. Clicking “Save” proceeds to a confirmation, while “Cancel” or the close button (×) dismisses the modal without saving.",
            whyItMatters: "-",
            extraSections: [
              {
                label: "Confirm Signatory",
                description: "Appears after clicking “Save,” asking the admin to confirm setting the entered name as the signatory for the position and barangay. If a signatory is already assigned, the dialog notes that this will replace the current signatory for that position. Clicking “Confirm” applies the change, while “Cancel” returns without making changes.",
              },
              {
                label: "Successfully Added Signatory",
                description: "Confirms that the new signatory has been successfully assigned to the position for the barangay. Clicking “Done” closes the dialog and returns the admin to the Signatories module.",
              },
            ],
          },
          {
            id: "assigned-signatory",
            label: "Assigned Signatory",
            description: "each position card (Barangay Secretary, Chairman Environment, Brgy. Sanitary Inspector, and Punong Barangay) displays the current signatory’s name and a color-coded accent along its left edge. The Past Signatories section of each card remains “No past signatories yet” until a signatory is replaced. Clicking a card allows the admin to change the signatory for that position.",
            whyItMatters: "-",
            
          },
          
        ],
      },
      {
        id: "iot-health",
        label: "IoT Health",
        steps: [
          {
            id: "iot-health-overview",
            label: "Sensor Nodes Health Overview",
            description: "This page monitors the hardware status of deployed nodes, showing summary metrics such as Online Nodes, Average Battery, Average Signal, and Sensor count, along with the Canal Network Map, which plots each node's location and live risk level (Sleep Mode, Normal, Warning, or Critical). ",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            
          },
          {
            id: "iot-summary-cards",
            label: "Summary Cards",
            description: "Displayed at the top of the tab, these cards give a quick overview of the sensor nodes’ health: Online Nodes shows how many sensor nodes are currently online and sending data, Average Battery shows the average battery voltage across the nodes, Average Signal shows the average signal strength in dBm, and Sensors Failing shows how many sensors are currently reporting a failure.",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            
          },
          {
            id: "iot-map",
            label: "Canal Network Map",
            description: "Displays the locations of the sensor nodes across the municipality of Rosario, La Union, with each node marked and labeled with its name and barangay (e.g., SN-1 - Poblacion West). The Map/Sat toggle switches between the standard map and satellite views, and the zoom controls (+ / −) adjust the zoom level.",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            extraSections: [
              {
                label: "Node Health Status Legend",
                description: "Indicates the health of each node through its marker color: gray for Offline/Sleep, green for Operating Normally, orange for Needs Attention, red for Critical Fault, and purple for Under Maintenance.",
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
                label: "Hardware Details",
                description: "Displays the hardware information of a sensor node, showing the node’s name and barangay (e.g., SN-2 - Poblacion West) with a badge for its current device status, such as Inactive. \n\nTwo action buttons are provided: Mark Under Maintenance, which sets the node’s status to Under Maintenance while it is being checked, repaired, or serviced, and Force Deep Sleep, which puts the node into a low-power sleep state.",
              },
              {
                label: "Device Information",
                description: "Lists the node’s technical details, including its Model (the microcontroller, cellular module, sensor, and camera it is built with), the installed Firmware version, and when the node was last Online. Below these, the health of each component is shown: the Microcontroller, the Water-level sensor, the Power Storage Reservoir (with its remaining capacity), and the Power Management Unit.",
              },
              {
                label: "Node Health Cards",
                description: "Displayed for the selected sensor node, these cards show the current condition of its key components. Each card has a colored indicator dot (green for good, yellow for marginal) and a progress bar for a quick visual check. \n\nBattery Voltage shows the node’s battery voltage in volts along with its remaining capacity percentage. 4G Signal shows the cellular signal strength in dBm, with a note such as “Marginal, check antenna” when the signal is weak. Sensor shows the continuity status of the node’s sensor, displaying “OK” with the note “Node sensor passing” when it is working properly.",
              },
            ],
          },
          {
            id: "mark-maintenance",
            label: "Mark Under Maintenance",
            description: "Mark Under Maintenance Dialog appears after clicking the “Mark Under Maintenance” button in the Hardware Details panel, informing the admin that the selected node will be flagged as under maintenance and removed from active monitoring until it is marked available again. \n\nThe Reason field is where the admin enters a note explaining why the node is being placed under maintenance (e.g., “Weak signal, needs antenna check”). \n\nClicking “Confirm” applies the status change, while “Cancel” or the close button (×) dismisses the dialog without making changes.",
            whyItMatters: "Placeholder — explain why IoT health matters.",
          
          },
          {
            id: "force-sleep",
            label: "Force Deep Sleep",
            description: "Force Deep Sleep Dialog appears after clicking the “Force Deep Sleep” button in the Hardware Details panel, informing the admin that the selected node will stop reporting until the sleep period ends or is cancelled. \n\nThe admin chooses how long the node will sleep by selecting a preset duration (30 min, 1 hour, 3 hours, 6 hours, 12 hours, or 24 hours) or by entering a Custom duration in hours, up to a maximum of 72. \n\nClicking “Start Sleep” puts the node into deep sleep for the chosen period, while “Cancel” or the close button (×) dismisses the dialog without making changes.",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            
          },
          {
            id: "iot-health-export",
            label: "Export and Print",
            description: "Export button lets the user download and print the System Health Summary.",
            whyItMatters: "Placeholder — explain why IoT health matters.",
            
          },
        ],
      },
      {
        id: "dev-maintenance",
        label: "Maintenance Logs",
        steps: [
          {
            id: "maintenance-overview",
            label: "Maintenance Overview",
            description: "The Maintenance Logs module keeps a record of the sensor nodes that have been placed under maintenance.",
            whyItMatters: "-",
          },
          {
            id: "maintenance-search-filter",
            label: "Search and Filter",
            description: "The Search field finds a specific log by keyword, and the month filter limits the logs to a chosen month (or shows all months).",
            whyItMatters: "-",
          
          },
          {
            id: "maintenance-logs-tbl",
            label: "Maintenance Logs Table",
            description: "Lists the maintenance records of the sensor nodes, showing each entry’s Node, the Reason it was placed under maintenance, the Date Marked when it was flagged, and the Date Fixed when it was marked available again.",
            whyItMatters: "-",
            extraSections: [
              {
                label: "Maintenance Logs (Empty State)",
                description: "When no maintenance records have been added to the system yet, the table displays a “No maintenance logs available” message in place of the list of entries.",
              }
            ]
          },
          {
            id: "maintenance-search-export",
            label: "Export and Print",
            description: "Export button lets the user download and print the System Health Summary.",
            whyItMatters: "-",
          
          },
          
        ],
      },
      {
        id: "system-audit-logs",
        label: "System Audit Logs",
        steps: [
          {
            id: "system-audit-logs-overview",
            label: "System Audit Logs and Activities Overview",
            description: "The Audit Logs module keeps a chronological record of the actions performed in the system, allowing the admin to track activity and maintain accountability.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
          
          },
          {
            id: "audit-logs-tbl",
            label: "System Audit Logs and Activities Table",
            description: "This table lists each entry’s timestamp, the user who performed the action, the action taken (e.g., Assigned Node, Set Signatory, Created User), the module where it occurred (e.g., Sensor Nodes, Signatory, User Management), and the details of the change.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
            extraSections: [
              {
                label: "Pagination Controls",
                description: "Located at the bottom of the table, they show the current page number and total number of pages (e.g., “Page 1 of 3”). Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
              }
            ]
          },
          {
            id: "search-filter-audit-logs",
            label: "Search and Filter",
            description: "The Search field finds a specific log by keyword, the Filter by Date dropdown limits the logs to a chosen starting and ending date.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
          },
          {
            id: "export-audit-logs",
            label: "Export and Print",
            description: "Clicking Export PDF opens an Export PDF confirmation modal, asking the user to verify that they want to export the audit logs shown as a PDF. Clicking Export proceeds with generating and downloading the PDF, while clicking Cancel closes the modal without exporting.",
            whyItMatters: "Placeholder — explain why audit logs matter.",
            extraSections: [
              {
                label: "Exported PDF File",
                description: "Export button lets the user download and print the Audit Logs.",
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
            description: "This panel lets administrators protect and recover system data. It includes the following features: Manual Backup, Scheduled Backup, Restore, Restore Points, and Recent Backup Activity. ",
            whyItMatters: "Placeholder — explain why settings matter.",
            extraSections: [
              {
                label: "Manual Backup",
                description: "Manual Backup lets users create an on-demand backup of the database, media, and AI models by clicking Backup Now, with the last backup date and time shown below. \n\nClicking Backup Now opens a Create Backup confirmation modal, informing the user that this will create a full backup of the database, media, and AI models, and allow them to choose where to save it. Clicking Backup Now in the modal proceeds with creating the backup, while clicking Cancel closes the modal without making any changes.",
              },
              {
                label: "Scheduled Backup",
                description: "This section allows administrators to set up automatic backups of the system so that data is saved regularly without manual action. \n\nTurning on the Enable auto-backup toggle will activatee it; when it is off, the system will only back up when done manually. The Frequency dropdown is used to select how often the backup should run (e.g., Daily, Weekly, or Monthly). Clicking Save Settings will apply the chosen schedule, since changes will not take effect until the settings are saved.",
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
                label: "Pagination Controls",
                description: "Located at the bottom of the table, they show the current page number and total number of pages (e.g., “Page 1 of 3”). Clicking “Next” moves to the following page of entries, while clicking “Previous” returns to the prior page; a button appears dimmed when there is no page in that direction.",
              },
            ]
          },
        ],
      },
    ],
  },
  {
    id:"logout",
    label:"Logout",
    steps: [
      {
        id: "loogout-btn",
        label: "Logout",
        description: "The Logout button is located at the bottom of the sidebar navigation, beside the user’s name and role.",
        whyItMatters: "Placeholder — explain why audit logs matter.",
        extraSections: [
          {
            label: "Logout Confirmation",
            description: "After clicking the Logout button, a dialog asks, “Are you sure you want to log out of your account?” Click Logout to end the session and return to the login page, or click Cancel or the (x) button to stay signed in.",
          }
        ]
      },
    ]
  }
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

  const [showTour, setShowTour] = useState(false)

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
    const seenIntro = !!localStorage.getItem(SEEN_INTRO_KEY)
    const seenTour = !!localStorage.getItem(SEEN_TOUR_KEY)
    setShowIntro(!seenIntro)
    setShowTour(seenIntro && !seenTour)
    setCheckedStorage(true)
  }, [])

  const dismissIntro = () => {
    localStorage.setItem(SEEN_INTRO_KEY, "true")
    setShowIntro(false)
    if (!localStorage.getItem(SEEN_TOUR_KEY)) setShowTour(true)
  }

  const finishTour = () => {
    localStorage.setItem(SEEN_TOUR_KEY, "true")
    setShowTour(false)
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

  const stepMatches = (s: ManualStep, q: string, exact = false) => {
  const text = [
    s.label,
    s.description,
    s.whyItMatters,
    ...(s.extraSections ?? []).flatMap((e) => [e.label ?? "", e.description]),
  ]
    .join(" ")
    .toLowerCase()
  if (!exact) return text.includes(q)
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text)
  }

  const ALL_LOCATIONS = TOPICS.flatMap((t) =>
    t.subTopics && t.subTopics.length > 0
      ? t.subTopics.flatMap((s) =>
          s.steps.map((step) => ({ topicId: t.id, subTopicId: s.id as string | null, step }))
        )
      : (t.steps ?? []).map((step) => ({ topicId: t.id, subTopicId: null as string | null, step }))
  )

  const currentGlobalIndex = ALL_LOCATIONS.findIndex(
  (l) =>
    l.topicId === activeTopicId &&
    l.subTopicId === (activeSubTopic ? activeSubTopic.id : null) &&
    l.step.id === activeStepId
)

  const query = search.trim().toLowerCase()

  const filteredTopics: ManualTopic[] = !query
  ? TOPICS
  : TOPICS.reduce<ManualTopic[]>((acc, topic) => {
      if (topic.label.toLowerCase().includes(query)) {
        acc.push(topic)
        return acc
      }
      if (topic.subTopics) {
        const matching = topic.subTopics.filter(
          (s) =>
            s.label.toLowerCase().includes(query) ||
            s.steps.some((st) => stepMatches(st, query))
        )
        if (matching.length > 0) acc.push({ ...topic, subTopics: matching })
        return acc
      }
      if ((topic.steps ?? []).some((st) => stepMatches(st, query))) acc.push(topic)
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
    const target = ALL_LOCATIONS[currentGlobalIndex + offset]
    if (target) goToStepId(target.topicId, target.subTopicId, target.step.id)
  }

  const handleSearch = (value: string) => {
  setSearch(value)
  const q = value.trim().toLowerCase()
  if (!q) return

  for (const exact of [true, false]) {
    if (activeStep && stepMatches(activeStep, q, exact)) return

    const inCurrentTopic = ALL_LOCATIONS.find(
      (l) => l.topicId === activeTopicId && stepMatches(l.step, q, exact)
    )
    if (inCurrentTopic) {
      goToStepId(inCurrentTopic.topicId, inCurrentTopic.subTopicId, inCurrentTopic.step.id)
      return
    }

    const anywhere = ALL_LOCATIONS.find((l) => stepMatches(l.step, q, exact))
    if (anywhere) {
      goToStepId(anywhere.topicId, anywhere.subTopicId, anywhere.step.id)
      return
    }
  }

  const labelMatch = TOPICS.find((t) => t.label.toLowerCase().includes(q))
    if (labelMatch) selectTopic(labelMatch.id)
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
        <ManualIntro onStartTour={() => setShowTour(true)} />
        <div data-tour="search">
          <SearchBar
            value={search}
            onChange={handleSearch}
            filter={filter}
            onFilterChange={setFilter}
            filterOptions={TOPICS.map((t) => t.label)}
          />
        </div>
        <div data-tour="topics">
        <TopicTabs
          topics={filteredTopics}
          activeTopicId={activeTopicId}
          activeSubTopicId={activeSubTopic ? activeSubTopic.id : null}
          onSelectTopic={selectTopic}
          onSelectSubTopic={selectSubTopic}
          searchActive={!!query}
        />
      </div>

        <div className="flex h-[calc(100vh-220px)]">
          <div className="overflow-y-auto" data-tour="steps">
            <StepsList
              title={sidebarTitle}
              description={`Below is the guide on how to use the ${sidebarTitle}.`}
              steps={activeSteps}
              activeStepId={activeStepId}
              visitedStepIds={visitedStepIds}
              onSelect={selectStep}
            />
          </div>
          <div className="flex-1 overflow-y-auto" data-tour="detail">
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
              hasPrevious={currentGlobalIndex > 0}
              hasNext={currentGlobalIndex >= 0 && currentGlobalIndex < ALL_LOCATIONS.length - 1}
            />
          </div>
          {showTour && <GuidedTour steps={TOUR_STEPS} onFinish={finishTour} />}
      </div>
      </div>
    </div>
  )
}