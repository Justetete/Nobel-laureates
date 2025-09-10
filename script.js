let prizeData = null;
let laureateData = null;

/* Loads JSON data from a given file and executes a callback function. */
function loadJSON(callback, file) {
    const xhr = new XMLHttpRequest(); // Create a new XMLHttpRequest object for async file loading
    xhr.overrideMimeType("application/json"); // Set the MIME type to JSON for correct parsing
    xhr.open("GET", file, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            callback(JSON.parse(xhr.responseText));
        }
    };
    xhr.send(null);
}

/* Event listener that waits for the DOM to load, then initializes data loading */
document.addEventListener('DOMContentLoaded', () => {
    loadJSON(data => {
        prizeData = data;
        if (prizeData && laureateData) { 
            processPrizeData(); // If both prizeData and laureateData are loaded, process the data
        }
    }, 'prize.json');

    // Load laureate data and assign it to laureateData variable
    loadJSON(data => {
        laureateData = data;
        if (prizeData && laureateData) {
            processPrizeData(); // If both prizeData and laureateData are loaded, process the data
        }
    }, 'laureate.json');
});

/* Displays the top 5 countries with the highest number of prizes per category. */
function displayTopCountries(countryCounts) {
    const countryListDiv = document.getElementById('country-list'); // Get the div element where country data will be displayed
    countryListDiv.innerHTML = ''; 

    const categories = Object.entries(countryCounts);
    let rowDiv = null;

    categories.forEach((category, index) => {
        if (index % 2 === 0) {
            rowDiv = document.createElement('div'); // Create a container for each prize category
            rowDiv.classList.add('category-row'); 
            countryListDiv.appendChild(rowDiv);
        }
        
        const categoryDiv = document.createElement('div'); // Create a container for each prize category
        categoryDiv.classList.add('category-box'); // Assign a CSS class for styling

        // Create and append the title for the category, e.g., "Top 5 in Physics"
        const categoryTitle = document.createElement('h3');
        categoryTitle.classList.add('category-title');
        categoryTitle.textContent = `${category[0].charAt(0).toUpperCase() + category[0].slice(1)}`;
        categoryDiv.appendChild(categoryTitle);

        // Create a table for displaying the top 5 countries and their prize counts
        const table = document.createElement('table');
        table.classList.add('country-data-table'); 
        categoryDiv.appendChild(table);

        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `<th>Country</th><th>Count</th>`;
        table.appendChild(headerRow);

        // Sort countries by prize count, take the top 5, and display them in the table
        const topCountries = Object.entries(category[1])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        topCountries.forEach(([country, count]) => {
            const row = document.createElement('tr');

            const countryCell = document.createElement('td');
            countryCell.textContent = country !== "Unknown" ? country : "Unknown Country";
            row.appendChild(countryCell);

            const countCell = document.createElement('td');
            countCell.textContent = count;
            row.appendChild(countCell);

            const buttonCell = document.createElement('td');
            const button = document.createElement('button');
            button.classList.add('show-laureates-btn');
            button.textContent = 'Show Laureates';
            button.onclick = () => showLaureates(country, category[0]);
            buttonCell.appendChild(button);
            row.appendChild(buttonCell);

            table.appendChild(row);
        });

        rowDiv.appendChild(categoryDiv);
    });
}


/* Displays laureates from a specified country in a specific prize category. */
function showLaureates(country, category) {
    const laureates = laureateData.laureates.filter(laureate =>
        laureate.prizes.some(prize => prize.category === category && (laureate.bornCountry || "Unknown") === country)
    );

    const laureateTable = document.getElementById('laureate-table'); // Get the table element for displaying laureates

    laureateTable.innerHTML = `<caption>Nobel laureates in ${category} from ${country}</caption>`; // Set table caption

    // Create header row for the laureates table
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>ID</th><th>Full Name</th><th>Date Awarded</th><th>Category</th><th>Details</th>';
    laureateTable.appendChild(headerRow);
    
    // Populate the table with filtered laureates
    laureates.forEach(laureate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${laureate.id}</td>
            <td>${laureate.firstname} ${laureate.surname || ''}</td>
            <td>${laureate.prizes[0].year}</td>
            <td>${laureate.prizes[0].category}</td>
            <td><button data-id="${laureate.id}" data-category="${category}" onclick="showBiography(${laureate.id}, '${category}')">Show Details</button></td>
        `;
        laureateTable.appendChild(row);
    });

    document.getElementById('laureates').style.display = 'block'; // Display the laureates section

    document.getElementById('laureates').scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/**
 * Processes prize data to calculate prize counts by country and category,
 * then displays the top countries for each category.
 */
function processPrizeData() {
    if (!laureateData || !laureateData.laureates) {
        console.error("Laureate data not loaded or invalid.");
        return;
    }

    const laureateCountries = {};
    laureateData.laureates.forEach(laureate => {
        if (laureate.bornCountry) {
            laureateCountries[laureate.id] = laureate.bornCountry;
        }
    });

    const countryCounts = {}; // Object to store prize counts by country and category
    prizeData.prizes.forEach(prize => { // Loop through each prize in the prize data
        if (!prize.laureates || prize.laureates.length === 0) {
            return;
        }

        prize.laureates.forEach(laureate => {
            const country = laureateCountries[laureate.id] || "Unknown";

            if (country === "Unknown") return; 

            if (!countryCounts[prize.category]) {
                countryCounts[prize.category] = {};
            }
            // Increment the prize count for this country in the given category
            countryCounts[prize.category][country] = (countryCounts[prize.category][country] || 0) + 1;
        });
    });

    displayTopCountries(countryCounts); // Call function to display top countries
}

/* Displays a biography paragraph for a selected laureate. */
function showBiography(id, category) {
    const laureate = laureateData.laureates.find(l => l.id === id.toString());
    if (!laureate) return;

    // Find the prize in the specified category
    const prize = laureate.prizes.find(prize => prize.category === category);
    if (!prize) return;  

    const name = `${laureate.firstname} ${laureate.surname || ''}`;
    const age = calculateAge(laureate.born, prize.year);
    const biographyText = `In ${prize.year}, at the age of ${age}, ${name} received a Nobel Prize in ${prize.category} ` + `in recognition of ${prize.motivation.replace(/(^")|("$)/g, '')}.`;

    // Exit if no matching prize is found
    document.querySelectorAll('.bio-row').forEach(row => row.remove());

    // Find the button and row where this biography will be displayed
    const button = document.querySelector(`button[data-id='${id}'][data-category='${category}']`);
    if (!button) return;
    const row = button.closest('tr');

    // Create a new row for the biography and insert it after the current row
    const bioRow = document.createElement('tr');
    bioRow.classList.add('bio-row');
    bioRow.setAttribute('data-id', id);
    const bioCell = document.createElement('td');
    bioCell.colSpan = 5; // Span the biography cell across all columns
    bioCell.innerHTML = `<p><em>${biographyText}</em></p>`;
    bioRow.appendChild(bioCell);

    // Insert the biography row directly after the laureate row
    row.after(bioRow);
}


function calculateAge(birthDate, awardYear) {
    const birth = new Date(birthDate); // Convert the birth date to a Date object
    const award = new Date(`${awardYear}-01-01`); // Create a Date object for the award year
    return award.getFullYear() - birth.getFullYear(); // Calculate and return the age
}

