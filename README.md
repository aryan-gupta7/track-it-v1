
- **`analysis.html`**: The HTML structure for the dashboard.
- **`analysis.js`**: JavaScript for processing data and generating visualizations.
- **`app.py`**: Python script to start/stop tracking and serve the dashboard.
- **`getusage_win.py`**: Python script to track active window usage on Windows.
- **`requirements.txt`**: Lists the Python dependencies required for the project.

## Installation

1. **Clone the repository**:
    ```sh
    git clone https://github.com/yourusername/track-it.git
    cd track-it
    ```

2. **Install Python dependencies**:
    ```sh
    pip install -r requirements.txt
    ```

## Usage

1. **Start the application**:
    ```sh
    python app.py
    ```

2. **Tracking**:
    - Click "Start Tracking" to begin monitoring your activity.
    - Click "Stop Tracking" to stop monitoring.

3. **Dashboard**:
    - Click "Show Dashboard" to start the local server and open the dashboard in your web browser.
    - The dashboard will be accessible at [http://localhost:8000/analysis.html](http://_vscodecontentref_/7).

## Data Visualization

The dashboard provides various visualizations:
- **Activity Timeline**: Displays a timeline of your application usage.
- **Application Usage**: Donut chart showing the distribution of time spent on different applications.
- **Usage Patterns**: Line chart showing hourly usage patterns.
- **Multi-dimensional Analysis**: Bubble chart comparing CPU and memory usage.
- **Weekly Trends**: Bar chart showing daily usage trends.

## Insights and Recommendations

The dashboard also provides smart insights and recommendations based on your usage patterns:
- **Productivity Score**: Based on application usage patterns.
- **Focus Score**: Percentage of long, focused sessions.
- **Work-Life Balance**: Analysis of work and personal time.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgements

- [D3.js](https://d3js.org/)
- [Chart.js](https://www.chartjs.org/)
- [Moment.js](https://momentjs.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [psutil](https://pypi.org/project/psutil/)
- [pywin32](https://pypi.org/project/pywin32/)

## Contact

For any questions or suggestions, please contact [your-email@example.com](mailto:your-email@example.com).
