#!/usr/bin/env python3

import argparse
import csv
import json
import math
import os
import string
import sys


class Postcodes:
    def __init__(self, multi_csv):
        assert os.path.isdir(multi_csv)
        self.multi_csv = multi_csv
        self.cache = {}

    def get_loc(self, postcode):
        maybe = self.cache.get(postcode, None)
        if maybe:
            return maybe

        outcode, _ = postcode.split()
        # If we didn't find it, read the appropriate file from multi_csv
        TEMPLATE = 'ONSPD_AUG_2019_UK_{}.csv'
        # At most there's two initial letters, so let's cut there, and possibly
        # strip numbers
        basename = TEMPLATE.format(outcode[:2].rstrip(string.digits))
        filename = os.path.join(self.multi_csv, basename)

        def into_dict_entry(rec):
            return (rec['pcds'], (float(rec['lat']), float(rec['long'])))

        with open(filename, 'r') as f:
            reader = csv.DictReader(f)

            self.cache.update(map(into_dict_entry, reader))

        loc = self.cache.get(postcode, None)
        assert loc
        return loc


# From https://gist.github.com/rochacbruno/2883505
def distance(origin, destination):
    lat1, lon1 = origin
    lat2, lon2 = destination
    radius = 6371  # km

    dlat = math.radians(lat2-lat1)
    dlon = math.radians(lon2-lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) \
        * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    d = radius * c

    return d


# For now, we're only dealing with distances. Assume the config file has
# locations as arrays with [0] being latitude, [1] being longitude.
def filter_with(config, postcodes, reader):
    if 'max-distance' not in config:
        yield from reader
        return

    max_distance = config['max-distance']
    for record in reader:
        loc = postcodes.get_loc(record['Postcode'])
        for entry in config['areas']:
            if distance(loc, entry['loc']) < max_distance:
                yield record
                continue


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', '-c', default=None,
                        help="Path to a JSON configuration file")
    parser.add_argument('multicsv',
                        help="Directory with the postcode multi_csv files")
    parser.add_argument('input', type=argparse.FileType(encoding='iso8859'),
                        help="Filename with school information")
    parser.add_argument('output', type=argparse.FileType(mode='w'),
                        help="Name of file to output")
    args = parser.parse_args()

    config = {}
    if args.config:
        assert os.path.isfile(args.config)
        with open(args.config, 'r') as f:
            config = json.load(f)

    postcodes = Postcodes(args.multicsv)
    reader = csv.DictReader(args.input)
    schools = []
    for school in filter_with(config, postcodes, reader):
        pc = school['Postcode']
        loc = postcodes.get_loc(pc)
        obj = {'kind': 'school'}
        obj['name'] = school['EstablishmentName']
        obj['status'] = school['EstablishmentStatus (name)']
        obj['type'] = school['TypeOfEstablishment (name)']
        obj['phase'] = school['PhaseOfEducation (name)']
        obj['age_low'] = school['StatutoryLowAge']
        obj['age_high'] = school['StatutoryHighAge']
        obj['nursery'] = school['NurseryProvision (name)']
        obj['gender'] = school['Gender (name)']
        obj['religious'] = school['ReligiousCharacter (name)']
        obj['capacity'] = school['SchoolCapacity']
        obj['girls'] = school['NumberOfGirls']
        obj['boys'] = school['NumberOfBoys']
        obj['ofsted_last'] = school['OfstedLastInsp']
        obj['street'] = school['Street']
        obj['url'] = school['SchoolWebsite']
        obj['last_inspection'] = school['DateOfLastInspectionVisit']
        obj['ofsted_rating'] = school['OfstedRating (name)']
        obj['loc'] = {'lat': loc[0], 'lng': loc[1]}
        obj['postcode'] = pc
        schools.append(obj)

    json.dump(schools, args.output)


if __name__ == '__main__':
    sys.exit(main())
