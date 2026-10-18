"use client"

import { useEffect, useState } from "react"
import IntroScreen from "./components/IntroScreen"
import ManualIntro from "./components/ManualIntro"
import SearchBar from "./components/SearchBar"
import TopicTabs from "./components/TopicTabs"
import StepsList, { ManualStep } from "./components/StepList"
import StepDetail from "./components/StepDetails"
import GuidedTour, { TourStep } from "./components/GuidedTour"

interface ManualTopic {
  id: string
  label: string
  steps: ManualStep[]
  imageUrl?: string;
}

// Each topic is its own manual page with its own step-by-step content.
// Swap the `steps` arrays for real content (or an API fetch) later —
// nothing else in this file needs to change.
const TOPICS: ManualTopic[] = [

  {
    id: "login",
    label: "Login",
    steps: [
      {
        id: "login-overview",
        label: "Login Overview",
        description: "This page is the entry point to the AGOS web dashboard, where the admin enters their registered email and password to access the system. A “Forgot Password?” link is also provided for account recovery.",
        whyItMatters: "This step is the secure entry point to the AGOS web dashboard, ensuring that only registered administrators can access the system and providing a recovery option when credentials are forgotten.",
        imageUrl: "/menro/screenshots/login/login-overview.png"
      },
      {
        id: "login-credentials",
        label: "Login User Credentials",
        description: "The login form consists of two fields: the Email field, where the admin enters their registered email address, and the Password field, where the admin enters their account password.",
        whyItMatters: "This step verifies the identity of each user before access is granted, protecting sensitive canal monitoring data from unauthorized use.",
        imageUrl: "/menro/screenshots/login/login-credentials.png",
        extraSections: [
          {
            label: "Hide | Unhide Password",
            description: "The password field includes an eye icon that toggles visibility, allowing the admin to show or hide the entered characters before logging in.",
            imageUrl: "/menro/screenshots/login/login-hide_unhide.png"
          },
          {
            label: "Incorrect Email | Password",
            description: "If the email or password entered is incorrect, an error message is displayed and access is not granted. Check the entered credentials and try again.",
          },
          {
            label: "Login Button",
            description: "Submits the entered email and password to authenticate the admin. If the credentials are correct, a Data Privacy Notice is shown next before the admin is granted access to the dashboard.",
            imageUrl: "/menro/screenshots/login/login-loginbtn.png"
          },
        ]
      },
      {
        id: "login-forgot-password",
        label: "Forgot Password",
        description: "Clicking the “Forgot Password?” link on the Login page starts the account recovery process, which lets the admin verify their identity and reset their password.",
        whyItMatters: "This step allows administrators who have forgotten their password to regain access to their account without needing to contact support, while keeping the account secure.",
        imageUrl: "/menro/screenshots/login/login-forgotpassword.png",
        extraSections: [
          {
            label: "Enter Email",
            description: "The admin enters their registered email address and submits it. A verification code is then sent to that email.",
          },
          {
            label: "Enter Verification Code",
            description: "The admin enters the code sent to the email they provided. Once the code is verified, they can proceed to set a new password.",
          },
        ]
      },
      {
        id: "login-privacy",
        label: "Data Privacy Notice",
        description: "For new users, this is shown after logging in with valid credentials, presenting the purpose of personal data collection and the user's rights as a data subject under Section 16 of the Data Privacy Act. The admin must check the consent box confirming they have read and understood the notice before clicking “Proceed”.",
        whyItMatters: "This step informs users how their personal data is collected and used, and records their consent in compliance with the Data Privacy Act.",
      },
      {
        id: "login-change-password",
        label: "Change Password",
        description: "After clicking “Proceed” in the Data Privacy Notice, this modal is shown, requiring the user to set a new password before proceeding into the system. The admin enters their current (temporary) password, then a new password and its confirmation, each with a visibility toggle.",
        whyItMatters: "This step replaces the temporary password issued upon account creation with one chosen by the user, ensuring that each account is secured by a private credential.",
        extraSections: [
          {
            label: "Current Password For New User",
            description: "This is where the user enters their existing (temporary) password issued upon account creation.",
          },
          {
            label: "New | Confirm Password",
            description: "This is where the user enters their desired new password and confirms it. The new password must meet the requirements — at least 8 characters, one special character, matching entries, and being different from the current password — which are validated in real time via checklist indicators. Clicking “Change Password” submits the update.",
          },
          {
            label: "Updating Password Dialog",
            description: "A loading indicator is shown after clicking “Change Password”, confirming that the system is securely processing and saving the new password.",
          },
          {
            label: "Changed Password Modal",
            description: "This is a confirmation that the password has been successfully updated and prompts the user to log in again using their new credentials. Clicking “Go to Login” returns the user to the Login page, where they enter their email and new password.",
          },
        ]
      },
    ],
  },
  {
    id: "sidebar",
    label: "Sidebar Navigation",
    steps: [
      {
        id: "sidebar-overview",
        label: "Sidebar Navigation Overview",
        description: "The main navigation panel present throughout the AGOS web dashboard, providing quick access to all primary modules: Regional Map, Alerts, Waste Analytics, Resource Optimization, Canal Hotspots, Barangay Reports, and User Manual. It also displays the currently logged-in user's name and role at the bottom, along with a logout button.",
        whyItMatters: "This step gives users consistent, one-click access to every module of the AGOS web dashboard from any page.",
        imageUrl: "/menro/screenshots/sidebar/sidebar-overview.png",
      },
      {
        id: "sidebar-items",
        label: "Sidebar Items",
        description: "Click any menu item in the sidebar to navigate to that module's page; the active page is highlighted to show your current location.",
        whyItMatters: "Highlighting the active page helps users keep track of where they are in the system while moving between modules.",
        imageUrl: "/menro/screenshots/sidebar/sidebar-items.png",

      },
      {
        id: "sidebar-user-panel",
        label: "User Panel",
        description: "Displays the name and role (e.g., “MENRO Officer” or “MENRO Staff”) of the currently logged-in user at the bottom of the sidebar, along with a logout icon for ending the session.",
        whyItMatters: "This step shows which account is currently signed in and provides a quick way to end the session, helping prevent unauthorized access on shared devices.",
        imageUrl: "/menro/screenshots/sidebar/sidebar-userpanel.png",
      },
    ],
  },
  {
    id: "topbar",
    label: "Top Bar",
    steps: [
      {
        id: "topbar-overview",
        label: "Top Bar Overview",
        description: "The top bar is present on every page of the AGOS web dashboard. It displays the title of the current page on the left and the notification bell icon on the right.",
        whyItMatters: "This step keeps users oriented on the page they are viewing and gives them constant access to the latest alerts from any module.",
        imageUrl: "/menro/screenshots/topbar/topbar-overview.png",
      },
      {
        id: "topbar-notifications",
        label: "Notification Bell",
        description: "Clicking the bell icon at the right side of the top bar opens the Notifications panel, which lists the most recent alerts generated by the system.",
        whyItMatters: "This step lets MENRO officers check new alerts without leaving the page they are working on, allowing faster response to emerging canal conditions.",
        imageUrl: "/menro/screenshots/topbar/topbar-bell.png",
        extraSections: [
          {
            label: "Notifications Panel",
            description: "Each notification shows the alert type (such as Moderate Clog Detected, Low Clog Detected, or Water Level Rising), the barangay and node where it was detected, and the time it occurred. The icon color indicates severity. Scroll within the panel to view older notifications. Once all notifications have been viewed, a “You've seen all alerts” message is displayed.",
            imageUrl: "/menro/screenshots/topbar/topbar-notif.png",
          },
          {
            label: "See All Alerts",
            description: "Clicking “See all alerts” at the bottom of the panel redirects the user to the Alerts tab, where the complete list of notifications can be searched and filtered.",
            imageUrl: "/menro/screenshots/topbar/topbar-allalerts.png",
          },
        ]
      },
      {
        id: "topbar-alert-modal",
        label: "Alert Notification Modal",
        description: "Clicking a clog or water level notification opens a pop-up showing the alert type (e.g., Water Level Rising) along with the node, barangay, and the date and time it was detected. The Details section shows the sensor readings, such as the water level in centimeters and the flow status. Click the X button to close the pop-up.",
        whyItMatters: "This step gives MENRO officers a quick summary of an alert, including its location and current canal readings, without leaving the page they are on.",
        imageUrl: "/menro/screenshots/topbar/topbar-alertmodal.png",
      },
      {
        id: "topbar-report-modal",
        label: "Barangay Report Modal",
        description: "When a barangay submits a report, a Report Submitted pop-up shows the barangay, the date and time it was detected, and the details of the report, such as the purok and severity. Clicking “View Report” redirects the user to the Barangay Reports tab, where the full report can be reviewed. Click the X button to close the pop-up.",
        whyItMatters: "This step notifies MENRO officers right away when a barangay submits a report, allowing them to review it and respond promptly.",
        imageUrl: "/menro/screenshots/topbar/topbar-brgymodal.png",
      },
    ],
  },
  {
    id: "map",
    label: "Regional Map",
    steps: [
      {
        id: "map-overview",
        label: "Overview of Regional Map",
        description: "The Dashboard provides a centralized overview of the canal monitoring system, the canal network map, live waste classification, live alerts, and reporting progress.",
        whyItMatters: "This step consolidates the canal network map, sensor node locations, live risk indicators, and reporting progress into a single geospatial interface, enabling MENRO officers to assess the overall condition of the canal system at a glance and identify areas requiring closer attention.",
        imageUrl: "/menro/screenshots/regional-map/map-overview.png",
        extraSections: [
          {
            label: "Canal Network Map",
            description: "This shows the entire map of Rosario La Union. Where you click a sensor node on the map to view its current status and reveal additional information about the selected node. The information displayed may include the node name, location, risk level, clog rate, and water level. You can also switch to a satellite view of the map for a more detailed, real-world perspective of the area.",
            imageUrl: "/menro/screenshots/regional-map/map-map.png",
          },
          {
            label: "Zoom In | Zoom Out",
            description: "Click the Plus (+) button to zoom in on the map. This allows users to view the canal network and sensor locations in greater detail and at a closer scale. \nClick the Minus (−) button to zoom out of the map. This allows users to view a wider area of the canal network and surrounding locations at a larger scale.",
            imageUrl: "/menro/screenshots/regional-map/map-zoom.png",
          },

           {
            label: "Legend",
            description: "Live Risk Level legend uses color-coded labels to help users quickly identify the condition and priority level of each monitored location.",
            imageUrl: "/menro/screenshots/regional-map/map-legend.png",
          },
          {
            label: "Node Labels",
            description: "Each sensor node on the map is marked with a pin and a label showing the node's name and the barangay where it is installed (for example, Node 1 – Poblacion West).",
            imageUrl: "/menro/screenshots/regional-map/map-labels.png",
          },
          {
            label: "Map | Satellite Toggle",
            description: "The toggle at the top right of the map switches between two views. Click Map for the standard street map, or click Sat for the satellite view, which shows a real-world aerial image of the area.",
            imageUrl: "/menro/screenshots/regional-map/map-sat.png",
          },
        ]
      },
      {
        id: "live-alerts",
        label: "Live Alerts",
        description: "This shows the Live Alerts section displays real-time notifications generated by the canal monitoring system. It allows users to quickly identify potential hazards, sensor issues, and changes in canal conditions that may require attention \n Red – Critical Clog",
        whyItMatters: "This step surfaces real-time notifications of hazards, sensor issues, and changing canal conditions directly on the map, enabling MENRO officers to detect and respond to critical clogs and emerging risks without delay.",
        imageUrl: "/menro/screenshots/regional-map/map-live-alerts.png",
        
      },
      {
        id: "waste-classification",
        label: "Waste Classifications",
        description: "This shows the Live Alerts section displays real-time notifications generated by the canal monitoring system. It allows users to quickly identify potential hazards, sensor issues, and changes in canal conditions that may require attention \n Red – Critical Clog",
        whyItMatters: "This step displays live waste classification data alongside sensor locations, enabling MENRO officers to correlate detected waste types with specific canal sites and support more targeted field response.",
        imageUrl: "/menro/screenshots/regional-map/map-live-waste.png",
      },
    ],
  },
  {
    id: "hotspots",
    label: "Canal Hotspots",
    steps: [
      {
        id: "hotspot-list",
        label: "Canal Hotspot Overview",
        description: "Provides an overview of designated canal hotspots across different barangays, including their total number, availability, and occupancy status.",
        whyItMatters: "This step presents the total number, availability, and occupancy status of designated hotspots across barangays, enabling MENRO officers to maintain an accurate understanding of current monitoring coverage.",
        imageUrl: "/menro/screenshots/hotspot/hotspot-overview.png",
        extraSections: [
          {
            label: "Search",
            description: "Use the search bar to look up a specific barangay or hotspot. The list updates as you type, showing only the matching results.",
            imageUrl: "/menro/screenshots/hotspot/hotspot-search.png",
          },
          
          {
            label: "Filter",
            description: "Use the filter dropdown to narrow the list of hotspots, such as by status (Available or Occupied). Select the default option to show all hotspots again.",
            imageUrl: "/menro/screenshots/hotspot/hotspot-filter.png",
          },
        ]
      },
      {
        id: "hotspot-manage",
        label: "Hotspot Table",
        description: "Provides an overview of designated canal hotspots across different barangays, including their total number, availability, and occupancy status.",
        whyItMatters: "This step presents each hotspot's name, shape, status, and exact geographic coordinates through the table and map view, enabling MENRO officers to verify sensor placement accuracy and confirm that monitored sites correspond to actual field conditions.",
        imageUrl: "/menro/screenshots/hotspot/hotspot-table.png",
        extraSections: [
          {
            label: "View Button",
            description: "Clicking the View button expands the row to display the list of hotspots registered under that barangay, showing each hotspot's name, shape, and status.",
            imageUrl: "/menro/screenshots/hotspot/hotspot-view.png",
          },
          {
            label: "View on Maps",
            description: "Clicking 'View on map' opens a modal displaying the hotspot's exact location on an interactive map, along with its coordinates and a status legend (Available/Occupied).",
            imageUrl: "/menro/screenshots/hotspot/hotspot-view-map.png",
          },
        ]
        
      },
      {
        id: "hotspot-manage-three-button",
        label: "Three-dot Menu",
        description: "Clicking the three-dot (⋮) menu opens a dropdown with two options: Edit, to modify the hotspot's details, and Remove, to delete the hotspot from the list.",
        whyItMatters: "This step provides tools to edit or remove hotspot records, with confirmation safeguards at each stage, enabling MENRO officers to keep the hotspot database accurate and current while minimizing the risk of unintended data loss.",
        imageUrl: "/menro/screenshots/hotspot/hotspot-three-dots.png",
        extraSections: [
          {
            label: "Remove Button",
            description: "Clicking Remove opens a confirmation dialog warning that the action cannot be undone. Clicking Remove permanently deletes the hotspot, while clicking Cancel closes the dialog without making any changes.",
            imageUrl: "/menro/screenshots/hotspot/hotspot-remove.png",
          },
          {
            label: "Edit Button",
            description: "Clicking Edit opens a form pre-filled with the hotspot's existing details. Hotspot Information (barangay, name, description), Canal Properties (width, shape, depth, sensor height), and Geographic Location (map pin with latitude/longitude). Allowing the user to update any field. Changes are saved by clicking Save Changes, or discarded by clicking Cancel.",
            imageUrl: "/menro/screenshots/hotspot/hotspot-edit.png",
          },
          {
            label: "Confirmation Modal - Save",
            description: "After clicking Save Changes, a Confirm Changes dialog appears asking the user to verify the update. Clicking Confirm Changes finalizes and saves the updates, while clicking Keep Editing returns to the edit form without saving.",
          },
          {
            label: "Confirmation Modal - Cancel",
            description: "Clicking Cancel while there are unsaved changes triggers a Cancel Changes confirmation dialog, warning the user that unsaved changes will be lost. Clicking Yes, Cancel discards the changes and closes the form, while clicking Keep Editing returns to the edit form without discarding anything.",
          },
        ]
      },
      {
        id: "hotspot-manage-add-button",
        label: "Add Button",
        description: "Clicking the “Add Hotspot” button opens the hotspot registration form, where users can enter the hotspot’s name and description, specify the canal properties such as width, shape, depth, and sensor height, and select its geographic location on the map. The hotspot coordinates are automatically recorded when the user clicks within the highlighted barangay boundary.",
        whyItMatters: "his step provides a structured registration form for hotspot details, canal properties, and geographic location, enabling MENRO officers to expand monitoring coverage in a consistent and verifiable manner as new sites are identified.",
        imageUrl: "/menro/screenshots/hotspot/hotspot-add.png",
        extraSections: [
          {
            label: "Confirmation Modal - Save",
            description: "Clicking the “Add Hotspot” button will display a confirmation modal asking the user to confirm the registration of the new hotspot. This ensures that all entered information is reviewed and confirmed before the hotspot is added to the system.",
          },
          {
            label: "Confirmation Modal - Cancel",
            description: "Clicking the “Cancel” button will display a confirmation modal asking the user to confirm whether they want to cancel the hotspot registration. This ensures that the user does not accidentally discard the information entered for the new hotspot.",
          },
        ]
      }
    ],
  },
  {
    id: "alerts",
    label: "Alerts",
    steps: [
      {
        id: "alert-notif-overview",
        label: "Alert Notification Overview",
        description: "This provides a centralized view of system notifications and detected events from sensor nodes. Users can search notifications, filter alerts by barangay and date, and select specific alert types such as Water Level Rising, Low/Moderate/Critical Clog, Node Offline, Low Battery, Weak Signal, and Sensor Failure to quickly identify and review relevant alerts.",
        whyItMatters: "This step presents searchable and filterable notifications covering conditions such as water level, clog severity, node connectivity, and sensor health, enabling MENRO officers to efficiently locate and prioritize relevant alerts amid high notification volume.",
        imageUrl: "/menro/screenshots/alert/alert-overview.png",
        extraSections: [
          {
            label: "Filters",
            description: "Use the search bar to look up a specific notification. The All Barangay dropdown narrows the list to a selected barangay, and the date dropdown (e.g., Last 30 days) limits the list to a chosen period. The alert type buttons (All, Water Level Rising, Low Clog Alert, Moderate Clog Alert, Critical Clog, and others) show only the selected type of alert.",
            imageUrl: "/menro/screenshots/alert/alert-filters.png",
          },
        ]
      },
      {
        id: "alert-notif",
        label: "Alert Notification",
        description: "Clicking an alert opens the Alert Details Panel, where users can view important information about the reported incident and its location. The panel provides details such as the alert severity, estimated waste volume, water level, flow rate, and waste classification to help users understand the condition and respond accordingly.",
        whyItMatters: "This step presents detailed incident information, including severity, estimated waste volume, water level, flow rate, and waste classification, enabling MENRO officers to accurately assess a reported condition and determine an appropriate response.",
        imageUrl: "/menro/screenshots/alert/alert-details.png",
      },
    ],
  },
  {
    id: "analytics",
    label: "Waste Analytics",
    steps: [
      {
        id: "waste-overview",
        label: "Waste Analytics Overview",
        description: "Records waste detected in canal hotspots, showing summary metrics such Total Classifications, Biodegradable, Recyclable, and Residual/Others, along with a table listing each classification's ID, Dominant Waste Type, Timestamp, Node, Location, Reading ID, and Confidence level. You can use the Search waste classification bar or the All Barangay, All Waste, and All Nodes dropdowns (individually or combined) to filter results. Selecting a record displays its full details in the panel on the right, and the Export button opens a print preview of the report.",
        whyItMatters: "By presenting collection volumes, categorical composition, and granular sensor readings within a single interface, it enables MENRO officers to monitor waste trends by location, verify the accuracy and reliability of automated classification through confidence scoring, and make informed, data-driven decisions regarding collection prioritization, disposal strategy, and resource allocation.",
        imageUrl: "/menro/screenshots/waste/waste-overview.png",
        extraSections: [
          {
            label: "Month Filter",
            description: "The month dropdown at the top right of the page (e.g., October 2026) sets the month being viewed. The summary cards and charts update to show the waste data for the selected month.",
            imageUrl: "/menro/screenshots/waste/waste-filter.png",
          },
          {
            label: "Pagination Controls",
            description: "The pagination controls (Previous and Next) navigate between pages of entries, and the close button (×) dismisses the modal.",
            imageUrl: "/menro/screenshots/waste/waste-pagination.png",
          },
        ]
      },
      {
        id: "waste-summary",
        label: "Waste Summary Cards",
        description: "Five cards displaying the total waste detected for the selected month, alongside its breakdown into Recyclable, Biodegradable, Residual, and Special waste, each shown in kilograms.",
        whyItMatters: "This step presents summary metrics, a searchable and filterable classification table, and detailed record views within a single interface, enabling MENRO officers to monitor waste trends across barangays and verify classification data efficiently.",
        imageUrl: "/menro/screenshots/waste/waste-summary-cards.png",
      },{
        id: "waste-collection",
        label: "Barangay Collection Card",
        description: "This panel presents a horizontal bar comparison of waste volumes collected, measured in kilograms, across the monitored barangays",
        whyItMatters: "This component enables officers to readily identify which localities are generating or reporting the greatest volume of waste, thereby supporting informed decisions regarding collection routing and the allocation of resources.",
        imageUrl: "/menro/screenshots/waste/waste-collection.png",
      },{
        id: "waste-composition",
        label: "Waste Composition Card",
        description: "This panel displays a donut chart depicting the proportional distribution of total waste across four classifications — Recyclable, Biodegradable, Residual, and Special Waste — accompanied by a corresponding percentage legend.",
        whyItMatters: "An accurate understanding of waste composition informs appropriate disposal strategy, including the extent to which composting, recycling, or specialized handling is required, with direct implications for budgetary planning and environmental compliance.",
        imageUrl: "/menro/screenshots/waste/waste-composition.png",
      },{
        id: "waste-readings",
        label: "Waste Classification Readings Card",
        description: "This panel provides a detailed log of individual sensor readings recorded at each node, presenting the classification identifier, node designation, dominant waste type, percentage breakdown by category, confidence score, estimated volume, and corresponding timestamp.",
        whyItMatters: "This component constitutes the underlying data record supporting the summary figures, allowing officers to verify sensor accuracy through confidence scoring, monitor trends over time, and investigate irregularities such as the unclassified ('None') entries observed in select records.",
        imageUrl: "/menro/screenshots/waste/waste-details.png",
      },{
        id: "waste-export",
        label: "Export Button",
        description: "Clicking the Export button opens a print preview of the report for the selected month. From the preview, users may review the report before clicking Print to print it or save it as a PDF, or Cancel to close the preview.",
        whyItMatters: "This step provides MENRO officers with a means of producing a physical or file-based record of waste analytics data for a given period, supporting formal documentation, offline reference, and submission to relevant municipal offices. Presenting a print preview prior to output allows officers to verify that the report reflects the correct data and time period before it is finalized, reducing the likelihood of exporting inaccurate or incomplete records.",
        imageUrl: "/menro/screenshots/waste/waste-export.png",
        extraSections: [
          {
            label: "Print Preview",
            description: "The print preview shows the formatted report. Click Print to print it or save it as a PDF, or Cancel to close the preview.",
            imageUrl: "/menro/screenshots/waste/waste-print.png",
          },
  ],
      },
    ],
   },
  {
    id: "resource",
    label: "Resource Optimization",
    steps: [
      {
        id: "resource-overview",
        label: "Resource Optimization Overview",
        description: "Presents summary cards for assigned nodes, total waste, critical areas, and cleared areas, followed by panels showing node status, severity rankings, and a priority deployment queue, plus a detailed hotspot table.",
        whyItMatters: "Consolidates node status and severity data in one place, helping MENRO officers quickly identify and prioritize areas needing field intervention.",
        imageUrl: "/menro/screenshots/resource/resource-overview.png",
      },
      {
        id: "resource-summary",
        label: "Resource Optimization Summary",
        description: "Four cards displaying the total number of assigned sensor nodes, total waste detected in kilograms, the number of critical areas, and the number of cleared areas.",
        whyItMatters: "These cards give MENRO officers an immediate, at-a-glance status of the resource deployment situation — how many nodes are being monitored, how much waste has accumulated, and how many areas are critical versus already resolved — allowing them to gauge overall system load and urgency before drilling into the detailed panels below.",
        imageUrl: "/menro/screenshots/resource/resource-summary-cards.png",
      },
      {
        id: "resource-status",
        label: "Waste Hotspot Status",
        description: "This panel presents a tabular summary of each sensor node, including its identification number, designated name, geographic location (barangay), operational status (Critical or Unknown), and the timestamp of its most recent update.",
        whyItMatters: "This component enables personnel to promptly identify which nodes require immediate attention, thereby ensuring that issues across dispersed locations are not overlooked.",
        imageUrl: "/menro/screenshots/resource/resource-hotspot.png",
        
      },
      {
        id: "resource-priority",
        label: "Priority Deployment Queue",
        description: "This panel provides a scrollable, sequentially numbered list of nodes requiring intervention, each annotated with an urgency classification (Critical or Unknown), the corresponding severity percentage, and a status note such as 'Immediate Action' or 'Awaiting Canal Data.'",
        whyItMatters: "This component translates severity data into a defined deployment order, providing field teams with clear direction regarding where action is required and the rationale for that priority.",
        imageUrl: "/menro/screenshots/resource/resource-priority.png",
        
      },{
        id: "resource-detailed",
        label: "Waste Hotspots (Detailed List)",
        description: "This panel consolidates comprehensive data for each hotspot, including node identifier, location, clog severity index with visual representation, trash volume in kilograms, current status, and the date and time of the last update.",
        whyItMatters: "This component serves as the complete, audit-level record underlying the summary indicators, enabling officers to cross-reference volume against severity and identify incomplete or outdated sensor entries.",
        imageUrl: "/menro/screenshots/resource/resource-details.png",
      },
    ],
  },
  {
    id: "barangay-reports",
    label: "Barangay Reports",
    steps: [
      {
        id: "brgy-reports-overview",
        label: "Barangay Reports Overview",
        description: "The Barangay Reports page lists the reports submitted by barangays about canal conditions. Each row shows the date submitted (with the week), barangay, purok, severity, and who filed the report.",
        whyItMatters: "This step gives MENRO officers a single list of all barangay-submitted reports, making it easy to find reports and prioritize those with higher severity.",
        imageUrl: "/menro/screenshots/reports/reports-overview.png",
        extraSections: [
          {
            label: "Filters",
            description: "Use the All Months, All weeks, All Barangays, and All Severity dropdowns to narrow the list to the reports you need.",
            imageUrl: "/menro/screenshots/reports/reports-filters.png",
          },
          {
            label: "Actions",
            description: "Click View to open the full report, or click Export to open a print preview of the report.",
            imageUrl: "/menro/screenshots/reports/reports-actionbtn.png",
          },
        ]
      },
      {
        id: "brgy-reports-details",
        label: "View Button | Report Details",
        description: "Clicking View opens the selected report, which first shows the Report Details tab. The header shows the barangay, purok, and severity, with a back arrow to return to the list and an Export button to open a print preview of the report.",
        whyItMatters: "This step presents the complete information submitted by the barangay, enabling MENRO officers to assess the condition of the canal and decide on the appropriate response.",
        imageUrl: "/menro/screenshots/reports/reports-view.png",
        extraSections: [
          {
            label: "Monitoring Site Information",
            description: "Shows the purok, barangay, city/municipality, and province of the monitored site.",
          },
          {
            label: "Detection Summary",
            description: "Shows when the obstruction was observed, when the report was submitted, and its severity level.",
          },
          {
            label: "Overall Canal Condition",
            description: "Shows the overall water level, water flow condition, and obstruction coverage of the whole purok.",
          },
          
          {
            label: "Barangay Response",
            description: "",
          },
          {
            label: "Photo Tab",
            description: "Clicking the Photos tab shows the supporting photos of the report, grouped into Before Cleanup, After Cleanup, and Additional Evidence.Click Report Details to go back to the report.",
            imageUrl: "/menro/screenshots/reports/reports-photo-tab.png",
          },
        ]
      },
      {
        id: "brgy-reports-export",
        label: "Export and Print",
        description: "Clicking the Export button, from the report list or from inside a report, opens a print preview of the report. From the preview, users may review the formatted report before clicking Print to print it or save it as a PDF, or Cancel to close the preview.",
        whyItMatters: "This step produces a printable record of the report for documentation and submission, and the preview lets MENRO officers check the report before it is printed or saved.",
        imageUrl: "/menro/screenshots/reports/reports-exportbtn.png",
        extraSections:[
          {
            label: "Print Preview",
            description: "The print preview shows the formatted report. Click Print to print it or save it as a PDF, or Cancel to close the preview.",
            imageUrl: "/menro/screenshots/reports/reports-print-preview.png",
          },
        ]
      },
    ],
  },
]

const SEEN_INTRO_KEY = "agos-manual-intro-seen"
const SEEN_TOUR_KEY = "agos-manual-tour-seen"

// Each target matches a data-tour="..." attribute in the components
const TOUR_STEPS: TourStep[] = [
  {
    target: "search",
    title: "Search the manual",
    description: "Type a keyword and the manual jumps to the best matching step. Use the X to clear it.",
    placement: "bottom",
  },
  {
    target: "topic-tabs",
    title: "Topic tabs",
    description: "Each tab is a part of the AGOS dashboard, such as Login or Sidebar Navigation. Click one to open its guide.",
    placement: "bottom",
  },
  {
    target: "steps-list",
    title: "Step list",
    description: "These are the steps for the selected topic. The current step is green and the ones you've already read turn blue.",
    placement: "right",
  },
  {
    target: "prev-next",
    title: "Previous and Next",
    description: "Move through the steps in order. On the last step of a topic, Next takes you to the next topic.",
    placement: "bottom",
  },
  {
    target: "step-content",
    title: "Step details",
    description: "Each step starts with a title and a short explanation of what to do.",
    placement: "bottom",
  },
  {
    target: "step-image",
    title: "Screenshot",
    description: "Every step comes with a screenshot of the screen being explained. Click it to open a larger view.",
    placement: "right",
  },
  {
    target: "step-why",
    title: "Why is this important?",
    description: "At the bottom of every step, this section explains why the step matters so you know its purpose.",
    placement: "top",
  },
]

export default function UserManual() {
  const [showIntro, setShowIntro] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [checkedStorage, setCheckedStorage] = useState(false)

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [activeTopicId, setActiveTopicId] = useState(TOPICS[0].id)
  const [activeStepId, setActiveStepId] = useState(TOPICS[0].steps[0].id)

  const [visitedByTopic, setVisitedByTopic] = useState<Record<string, string[]>>({
    [TOPICS[0].id]: [TOPICS[0].steps[0].id],
  })

  useEffect(() => {
    const seen = localStorage.getItem(SEEN_INTRO_KEY)
    setShowIntro(!seen)
    // Show the tour until it has been finished or skipped once
    setShowTour(!localStorage.getItem(SEEN_TOUR_KEY))

    setCheckedStorage(true)
  }, [])

  const dismissIntro = () => {
    localStorage.setItem(SEEN_INTRO_KEY, "true")
    setShowIntro(false)
  }

  const finishTour = () => {
    localStorage.setItem(SEEN_TOUR_KEY, "true")
    setShowTour(false)
  }

  // MENRO Officer and MENRO Staff share the same modules, so every topic is visible
  const visibleTopics = TOPICS

  const activeTopic =
    visibleTopics.find((t) => t.id === activeTopicId) ?? visibleTopics[0]
  const activeStepIndex = activeTopic.steps.findIndex((s) => s.id === activeStepId)
  const activeStep = activeTopic.steps[activeStepIndex] ?? activeTopic.steps[0]
  const visitedStepIds = visitedByTopic[activeTopic.id] ?? []

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

  const topicMatches = (t: ManualTopic, q: string) =>
    !q || t.label.toLowerCase().includes(q) || t.steps.some((s) => stepMatches(s, q))

  const filteredTopics = visibleTopics.filter((t) =>
    topicMatches(t, search.trim().toLowerCase())
  )

  const markVisited = (topicId: string, stepId: string) => {
    setVisitedByTopic((prev) => {
      const current = prev[topicId] ?? []
      if (current.includes(stepId)) return prev
      return { ...prev, [topicId]: [...current, stepId] }
    })
  }

  const goToStepId = (topicId: string, stepId: string) => {
    setActiveTopicId(topicId)
    setActiveStepId(stepId)
    markVisited(topicId, stepId)
  }

  const selectTopic = (topicId: string) => {
    const topic = visibleTopics.find((t) => t.id === topicId)
    if (!topic) return
    goToStepId(topicId, topic.steps[0].id)
  }

  const selectStep = (stepId: string) => {
    goToStepId(activeTopic.id, stepId)
  }

  // Typing in the search jumps to the best matching step: exact word matches first, then partial matches
  const handleSearch = (value: string) => {
    setSearch(value)
    const q = value.trim().toLowerCase()
    if (!q) return

    for (const exact of [true, false]) {
      if (stepMatches(activeStep, q, exact)) return

      const inCurrent = activeTopic.steps.find((s) => stepMatches(s, q, exact))
      if (inCurrent) {
        goToStepId(activeTopic.id, inCurrent.id)
        return
      }

      for (const t of visibleTopics) {
        const step = t.steps.find((s) => stepMatches(s, q, exact))
        if (step) {
          goToStepId(t.id, step.id)
          return
        }
      }
    }

    // Matches only a topic label: open that topic's first step
    const labelMatch = visibleTopics.find((t) => t.label.toLowerCase().includes(q))
    if (labelMatch) selectTopic(labelMatch.id)
  }

  const activeTopicIndex = visibleTopics.findIndex((t) => t.id === activeTopic.id)
  const nextTopic = visibleTopics[activeTopicIndex + 1]
  const isLastStep = activeStepIndex === activeTopic.steps.length - 1

  const goToStep = (offset: number) => {
    const nextIndex = activeStepIndex + offset

    // On the last step, "Next" moves to the first step of the next topic
    if (offset > 0 && isLastStep && nextTopic) {
      goToStepId(nextTopic.id, nextTopic.steps[0].id)
      return
    }

    if (nextIndex >= 0 && nextIndex < activeTopic.steps.length) {
      goToStepId(activeTopic.id, activeTopic.steps[nextIndex].id)
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

  return (
    <div className="max-w-20xl mx-auto py-2 px-1">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <ManualIntro onStartTour={() => setShowTour(true)} />
        <SearchBar
          value={search}
          onChange={handleSearch}
          filter={filter}
          onFilterChange={setFilter}
          filterOptions={visibleTopics.map((t) => t.label)}
        />
        <TopicTabs
          topics={filteredTopics}
          activeTopic={activeTopic.id}
          onSelect={selectTopic}
        />

        <div className="flex">
          <StepsList
            title={activeTopic.label}
            description={`Below is the guide on how to use the ${activeTopic.label}.`}
            steps={activeTopic.steps}
            activeStepId={activeStep.id}
            visitedStepIds={visitedStepIds}
            onSelect={selectStep}
          />
          <StepDetail
            stepIndex={activeStepIndex}
            totalSteps={activeTopic.steps.length}
            title={activeStep.label}
            description={activeStep.description}
            imageUrl={activeStep.imageUrl}
            whyItMatters={activeStep.whyItMatters}
            extraSections={activeStep.extraSections}
            onPrevious={() => goToStep(-1)}
            onNext={() => goToStep(1)}
            hasPrevious={activeStepIndex > 0}
            hasNext={!isLastStep || !!nextTopic}
            nextLabel={isLastStep && nextTopic ? "Next Topic" : "Next"}
          />
        </div>
      </div>

      {showTour && <GuidedTour steps={TOUR_STEPS} onFinish={finishTour} />}
    </div>
  )
}